"""HTTP API for authentication and account lifecycle.

Exposes SIWE-based wallet login (JWT issuance), the authenticated user profile,
GDPR-style data export, and hard deletion. Spore, payments, and rewards models
are aggregated in the export payload for a single downloadable snapshot.
"""

import hmac
import logging

from django.db import transaction
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from apps.contributions.models import Contribution
from apps.payments.models import Subscription
from apps.payments.services import get_or_create_user_sub
from apps.profiles.models import Profile
from apps.rewards.models import LootChest, UserBadge
from apps.spore.models import (
    AuditLog,
    GraphQueryRun,
    RelationshipAnalysisRun,
    ScoreRun,
    TenantMembership,
    UsageEvent,
)
from common.exceptions import WalletVerificationError

from .models import User
from .merge_service import (
    MergeRequired,
    apply_provider_payload,
    consume_merge_token,
    execute_merge,
    find_user_by_email,
    initiate_email_merge,
    maybe_block_email_login,
    requires_email_merge_confirmation,
)
from .serializers import (
    EmailVerifySerializer,
    IdentityMergeConfirmSerializer,
    IdentityMergeInitiateSerializer,
    UserSerializer,
    UserUpdateSerializer,
    WalletVerifySerializer,
)
from .supabase_auth import SupabaseAuthError, fetch_supabase_user

logger = logging.getLogger(__name__)


def get_tokens_for_user(user: User) -> dict:
    """Generate JWT access + refresh tokens for a user."""
    refresh = RefreshToken.for_user(user)
    return {
        "access": str(refresh.access_token),
        "refresh": str(refresh),
    }


class WalletVerifyView(APIView):
    """Wallet login: validate SIWE payload, upsert user, return SimpleJWT tokens.

    Flow: client signs a SIWE message with the wallet; sends ``wallet_address``,
    ``message``, and ``signature``. We verify the signature matches the claimed
    address (skipped in DEBUG when ``ENFORCE_SIWE`` is false), then
    ``get_or_create`` the user by normalized address and return access/refresh
    plus serialized user and ``created`` flag.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        """Validate body, verify SIWE, issue JWTs (201-style payload with tokens)."""
        serializer = WalletVerifySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        wallet_address = serializer.validated_data["wallet_address"].lower()
        message = serializer.validated_data["message"]
        signature = serializer.validated_data["signature"]

        try:
            qa_bypass = self._verify_signature(request, wallet_address, message, signature)
        except WalletVerificationError as e:
            return Response({"detail": str(e)}, status=status.HTTP_401_UNAUTHORIZED)

        if qa_bypass:
            user = User.objects.filter(wallet_address=wallet_address, is_active=True).first()
            if not user:
                return Response(
                    {"detail": "QA wallet is allowed but has not been seeded"},
                    status=status.HTTP_401_UNAUTHORIZED,
                )
            created = False
        else:
            user, created = User.objects.get_or_create(
                wallet_address=wallet_address,
                defaults={
                    "username": f"user_{wallet_address[:8]}",
                },
            )

        get_or_create_user_sub(user)

        profile, _ = Profile.objects.get_or_create(user=user)
        if not profile.onboarding_completed:
            profile.onboarding_completed = True
            profile.save(update_fields=["onboarding_completed", "updated_at"])

        tokens = get_tokens_for_user(user)
        logger.info("[Auth] Wallet login: %s (new=%s)", wallet_address, created)

        return Response({
            **tokens,
            "user": UserSerializer(user).data,
            "created": created,
        })

    def _verify_signature(self, request, wallet_address: str, message: str, signature: str) -> bool:
        """Verify SIWE or a tightly gated QA wallet bypass.

        Local dev still skips SIWE when ``DEBUG`` and ``ENFORCE_SIWE`` is false.
        Deployed fake-wallet QA requires all of: explicit enable flag, allowlisted
        wallet, configured secret, and matching request secret. Returns ``True``
        only when the QA bypass was used.
        """
        from django.conf import settings

        if self._is_qa_wallet_bypass(request, wallet_address):
            logger.warning("[Auth] QA wallet login bypass used for %s", wallet_address)
            return True

        # Skip in dev if no verification configured
        if settings.DEBUG and not getattr(settings, "ENFORCE_SIWE", False):
            return False

        try:
            from siwe import SiweMessage
            siwe_msg = SiweMessage.from_message(message)
            siwe_msg.verify(signature)
            if siwe_msg.address.lower() != wallet_address:
                raise WalletVerificationError("Wallet address mismatch")
        except Exception as e:
            raise WalletVerificationError(f"Signature verification failed: {e}") from e
        return False

    def _is_qa_wallet_bypass(self, request, wallet_address: str) -> bool:
        from django.conf import settings

        if not getattr(settings, "QA_WALLET_LOGIN_ENABLED", False):
            return False

        allowed_wallets = set(getattr(settings, "QA_WALLET_LOGIN_WALLETS", []))
        if wallet_address not in allowed_wallets:
            return False

        expected_secret = getattr(settings, "QA_WALLET_LOGIN_SECRET", "")
        if not expected_secret:
            return False

        supplied_secret = (
            request.headers.get("X-QA-Auth-Secret")
            or request.data.get("qa_bypass_secret")
            or request.data.get("qaBypassSecret")
            or ""
        )
        return hmac.compare_digest(str(supplied_secret), str(expected_secret))


class EmailVerifyView(APIView):
    """Email login: verify Supabase OTP session token, upsert user, return JWTs."""

    permission_classes = [AllowAny]
    throttle_scope = "email_verify"

    def post(self, request):
        serializer = EmailVerifySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        access_token = serializer.validated_data["access_token"]

        try:
            supabase_user = fetch_supabase_user(access_token)
        except SupabaseAuthError as exc:
            logger.info("[Auth] Email verify rejected: %s", exc)
            return Response({"detail": str(exc)}, status=status.HTTP_401_UNAUTHORIZED)

        email = supabase_user["email"]

        incoming_user = request.user if request.user.is_authenticated else None
        try:
            maybe_block_email_login(email=email, incoming_user=incoming_user)
        except MergeRequired:
            return Response(
                {
                    "mergeRequired": True,
                    "detail": "Confirmation email sent. Check your inbox to link this account.",
                },
                status=status.HTTP_409_CONFLICT,
            )

        user = find_user_by_email(email)
        created = False
        if not user:
            user = User.objects.create_user(
                username=User.generate_username(),
                email=email,
            )
            created = True

        get_or_create_user_sub(user)

        tokens = get_tokens_for_user(user)
        logger.info("[Auth] Email login: %s (new=%s)", email, created)

        return Response({
            **tokens,
            "user": UserSerializer(user).data,
            "created": created,
        })


class IdentityMergeInitiateView(APIView):
    """Explicitly initiate email-confirm merge for the authenticated session user."""

    permission_classes = [IsAuthenticated]
    throttle_scope = "email_verify"

    def post(self, request):
        serializer = IdentityMergeInitiateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            supabase_user = fetch_supabase_user(serializer.validated_data["access_token"])
        except SupabaseAuthError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_401_UNAUTHORIZED)

        email = supabase_user["email"]
        target = find_user_by_email(email)
        if not target or not requires_email_merge_confirmation(
            target,
            incoming_user=request.user,
        ):
            return Response(
                {"detail": "No wallet account requires merge confirmation for this email."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        initiate_email_merge(
            email=email,
            target_user=target,
            source_user=request.user,
        )
        return Response(
            {
                "mergeRequired": True,
                "detail": "Confirmation email sent. Check your inbox to link this account.",
            },
            status=status.HTTP_202_ACCEPTED,
        )


class IdentityMergeConfirmView(APIView):
    """Confirm a pending identity merge via single-use token."""

    permission_classes = [AllowAny]
    throttle_scope = "email_verify"

    def post(self, request):
        serializer = IdentityMergeConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        token = serializer.validated_data["token"].strip()

        payload = consume_merge_token(token)
        if not payload:
            return Response(
                {"detail": "Invalid or expired merge token."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            target = User.objects.get(pk=payload["target_user_id"], is_active=True)
        except User.DoesNotExist:
            return Response(
                {"detail": "Merge target account not found."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        source = None
        source_id = payload.get("source_user_id")
        if source_id:
            source = User.objects.filter(pk=source_id, is_active=True).first()

        merged_user = execute_merge(
            target=target,
            source=source,
            email=payload.get("email"),
        )
        provider_payload = payload.get("provider_payload") or {}
        if provider_payload:
            apply_provider_payload(target=merged_user, provider_payload=provider_payload)
        get_or_create_user_sub(merged_user)
        tokens = get_tokens_for_user(merged_user)
        logger.info("[Merge] Confirmed merge into user %s", merged_user.id)

        return Response({
            **tokens,
            "user": UserSerializer(merged_user).data,
            "merged": True,
        })


class UserProfileView(APIView):
    """Authenticated user's own record: read and partial update (display name, etc.)."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Return ``UserSerializer`` for ``request.user``."""
        return Response(UserSerializer(request.user).data)

    def patch(self, request):
        """Apply ``UserUpdateSerializer`` partial fields; return updated user JSON."""
        serializer = UserUpdateSerializer(
            request.user, data=request.data, partial=True
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(UserSerializer(request.user).data)


class UserDataExportView(APIView):
    """Assemble a single JSON export of the user's data across core and Spore tables."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Return nested dict: user, profile, contributions, tenants, Spore runs, rewards."""
        user = request.user
        memberships = list(
            TenantMembership.objects.select_related("tenant")
            .filter(user=user)
            .order_by("created_at")
        )
        tenant_ids = [membership.tenant_id for membership in memberships]

        profile = Profile.objects.filter(user=user).first()
        export = {
            "user": UserSerializer(user).data,
            "profile": {
                "total_xp": profile.total_xp,
                "educator_xp": profile.educator_xp,
                "builder_xp": profile.builder_xp,
                "creator_xp": profile.creator_xp,
                "scout_xp": profile.scout_xp,
                "diplomat_xp": profile.diplomat_xp,
                "skill_tree_state": profile.skill_tree_state,
                "rank": profile.rank,
            }
            if profile
            else None,
            "contributions": list(
                Contribution.objects.filter(user=user)
                .order_by("-created_at")
                .values(
                    "id",
                    "platform",
                    "platform_content_id",
                    "content_text",
                    "content_url",
                    "total_score",
                    "xp_awarded",
                    "farming_flag",
                    "created_at",
                    "scored_at",
                )
            ),
            "memberships": [
                {
                    "tenant_id": str(membership.tenant_id),
                    "tenant_slug": membership.tenant.slug,
                    "tenant_name": membership.tenant.name,
                    "tenant_plan": membership.tenant.plan,
                    "tenant_is_active": membership.tenant.is_active,
                    "role": membership.role,
                    "is_active": membership.is_active,
                    "tenant_metadata": membership.tenant.metadata,
                }
                for membership in memberships
            ],
            "subscriptions": list(
                Subscription.objects.filter(user=user)
                .select_related("tenant")
                .order_by("-created_at")
                .values(
                    "id",
                    "tenant__slug",
                    "plan",
                    "status",
                    "current_period_start",
                    "current_period_end",
                    "cancel_at_period_end",
                    "created_at",
                )
            ),
            "spore": {
                "score_runs": list(
                    ScoreRun.objects.filter(user=user)
                    .order_by("-created_at")
                    .values(
                        "id",
                        "tenant__slug",
                        "contribution_id",
                        "source_platform",
                        "score_version",
                        "confidence",
                        "final_score",
                        "created_at",
                    )
                ),
                "query_runs": list(
                    GraphQueryRun.objects.filter(user=user)
                    .order_by("-created_at")
                    .values(
                        "id",
                        "tenant__slug",
                        "query_text",
                        "query_hash",
                        "result_count",
                        "created_at",
                    )
                ),
                "relationship_runs": list(
                    RelationshipAnalysisRun.objects.filter(user=user)
                    .order_by("-created_at")
                    .values(
                        "id",
                        "tenant__slug",
                        "account_a",
                        "account_b",
                        "days",
                        "created_at",
                    )
                ),
                "usage_events": list(
                    UsageEvent.objects.filter(user=user, tenant_id__in=tenant_ids)
                    .order_by("-created_at")
                    .values(
                        "id",
                        "tenant__slug",
                        "metric",
                        "units",
                        "status_code",
                        "metadata",
                        "created_at",
                    )[:200]
                ),
                "audit_logs": list(
                    AuditLog.objects.filter(user=user, tenant_id__in=tenant_ids)
                    .order_by("-created_at")
                    .values(
                        "id",
                        "tenant__slug",
                        "action",
                        "target_type",
                        "target_id",
                        "metadata",
                        "created_at",
                    )[:200]
                ),
            },
            "rewards": {
                "badges": list(
                    UserBadge.objects.filter(user=user)
                    .select_related("badge")
                    .values(
                        "id",
                        "badge__name",
                        "badge__rarity",
                        "minted",
                        "earned_at",
                    )
                ),
                "loot_chests": list(
                    LootChest.objects.filter(user=user)
                    .order_by("-created_at")
                    .values(
                        "id",
                        "rarity",
                        "loot_type",
                        "loot_name",
                        "opened",
                        "opened_at",
                        "source",
                        "created_at",
                    )
                ),
            },
        }
        return Response(export, status=status.HTTP_200_OK)


class UserDeleteView(APIView):
    """Permanently delete the authenticated user (cascades per model FK rules)."""

    permission_classes = [IsAuthenticated]

    @transaction.atomic
    def delete(self, request):
        """Idempotent 204: delete by id if row exists, else still 204."""
        user_id = request.user.id
        user = User.objects.filter(id=user_id).first()
        if not user:
            return Response(status=status.HTTP_204_NO_CONTENT)
        user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
