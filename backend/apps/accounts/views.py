"""HTTP API for authentication and account lifecycle.

Exposes SIWE-based wallet login (JWT issuance), the authenticated user profile,
GDPR-style data export, and hard deletion. Spore, payments, and rewards models
are aggregated in the export payload for a single downloadable snapshot.
"""

import logging

from django.db import transaction
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from apps.contributions.models import Contribution
from apps.payments.models import Subscription
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
from .serializers import UserSerializer, UserUpdateSerializer, WalletVerifySerializer

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
            self._verify_signature(wallet_address, message, signature)
        except WalletVerificationError as e:
            return Response({"detail": str(e)}, status=status.HTTP_401_UNAUTHORIZED)

        user, created = User.objects.get_or_create(
            wallet_address=wallet_address,
            defaults={
                "username": f"user_{wallet_address[:8]}",
            },
        )

        tokens = get_tokens_for_user(user)
        logger.info("[Auth] Wallet login: %s (new=%s)", wallet_address, created)

        return Response({
            **tokens,
            "user": UserSerializer(user).data,
            "created": created,
        })

    def _verify_signature(self, wallet_address: str, message: str, signature: str):
        """Verify SIWE via ``siwe``; ensure message address matches ``wallet_address``.

        When ``DEBUG`` and not ``ENFORCE_SIWE``, verification is skipped so local
        dev can proceed without full SIWE setup. Any failure raises
        ``WalletVerificationError`` for a 401 response.
        """
        from django.conf import settings

        # Skip in dev if no verification configured
        if settings.DEBUG and not getattr(settings, "ENFORCE_SIWE", False):
            return

        try:
            from siwe import SiweMessage
            siwe_msg = SiweMessage.from_message(message)
            siwe_msg.verify(signature)
            if siwe_msg.address.lower() != wallet_address:
                raise WalletVerificationError("Wallet address mismatch")
        except Exception as e:
            raise WalletVerificationError(f"Signature verification failed: {e}") from e


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
