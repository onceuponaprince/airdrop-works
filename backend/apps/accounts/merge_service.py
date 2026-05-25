"""Email-confirm identity merge (S6).

When login would link a new identity to an existing wallet account by email,
require a Resend confirmation link before merging accounts.
"""

from __future__ import annotations

import logging
import secrets
from typing import Any

from django.conf import settings
from django.core.cache import cache
from django.db import transaction

from apps.contributions.models import Contribution
from common.email import send_email

from .models import DiscordConnection, TelegramConnection, TwitterConnection, User
from .social_models import UserSocialAccount

logger = logging.getLogger(__name__)

CACHE_PREFIX = "identity_merge:"
TOKEN_TTL_SECONDS = 3600


class MergeRequired(Exception):
    """Raised when email confirmation is required before linking identities."""

    def __init__(self, *, email: str, token: str):
        self.email = email
        self.token = token
        super().__init__(f"Merge confirmation required for {email}")


def normalize_email(email: str) -> str:
    return User.objects.normalize_email(email.strip())


def find_user_by_email(email: str) -> User | None:
    normalized = normalize_email(email)
    return User.objects.filter(email__iexact=normalized, is_active=True).first()


def requires_email_merge_confirmation(existing: User, *, incoming_user: User | None = None) -> bool:
    """Wallet accounts require explicit email confirmation before email/social link."""
    if not existing.wallet_address:
        return False
    if incoming_user and incoming_user.id == existing.id:
        return False
    return True


def create_merge_token(
    *,
    target_user_id: str,
    email: str,
    source_user_id: str | None = None,
    provider: str | None = None,
    provider_payload: dict[str, Any] | None = None,
) -> str:
    token = secrets.token_urlsafe(32)
    cache.set(
        f"{CACHE_PREFIX}{token}",
        {
            "target_user_id": str(target_user_id),
            "source_user_id": str(source_user_id) if source_user_id else None,
            "email": normalize_email(email),
            "provider": provider,
            "provider_payload": provider_payload or {},
        },
        TOKEN_TTL_SECONDS,
    )
    return token


def get_merge_payload(token: str) -> dict[str, Any] | None:
    payload = cache.get(f"{CACHE_PREFIX}{token}")
    return payload if isinstance(payload, dict) else None


def consume_merge_token(token: str) -> dict[str, Any] | None:
    key = f"{CACHE_PREFIX}{token}"
    payload = cache.get(key)
    if not isinstance(payload, dict):
        return None
    cache.delete(key)
    return payload


def send_merge_confirmation_email(email: str, token: str) -> bool:
    confirm_url = (
        f"{str(settings.FRONTEND_URL or 'http://localhost:3000').rstrip('/')}"
        f"/api/auth/merge/confirm?token={token}"
    )
    html = f"""
    <div style="font-family: monospace; background: #0A0B10; color: #E8ECF4; padding: 40px; max-width: 600px;">
        <h1 style="color: #10B981; font-size: 18px;">AI(r)DROP</h1>
        <h2 style="color: #E8ECF4;">Confirm account link</h2>
        <p style="color: #6B7280;">
            Someone requested to link this email to an existing AI(r)Drop account.
            If this was you, confirm within one hour:
        </p>
        <p>
            <a href="{confirm_url}" style="color: #10B981;">Confirm account link</a>
        </p>
        <p style="color: #6B7280; font-size: 12px;">
            If you did not request this, you can ignore this email.
        </p>
    </div>
    """
    return send_email(
        to=email,
        subject="Confirm your AI(r)Drop account link",
        html=html,
    )


def initiate_email_merge(
    *,
    email: str,
    target_user: User,
    source_user: User | None = None,
    provider: str | None = None,
    provider_payload: dict[str, Any] | None = None,
) -> str:
    token = create_merge_token(
        target_user_id=str(target_user.id),
        email=email,
        source_user_id=str(source_user.id) if source_user else None,
        provider=provider,
        provider_payload=provider_payload,
    )
    send_merge_confirmation_email(email, token)
    logger.info(
        "[Merge] Confirmation email queued for %s (target=%s source=%s)",
        email,
        target_user.id,
        source_user.id if source_user else None,
    )
    return token


def maybe_block_email_login(*, email: str, incoming_user: User | None = None) -> None:
    """Raise MergeRequired when email login would link into a wallet account."""
    existing = find_user_by_email(email)
    if not existing or not requires_email_merge_confirmation(existing, incoming_user=incoming_user):
        return
    token = initiate_email_merge(email=email, target_user=existing, source_user=incoming_user)
    raise MergeRequired(email=email, token=token)


def _reassign_one_to_one(model, source: User, target: User) -> None:
    connection = model.objects.filter(user=source).first()
    if not connection:
        return
    if model.objects.filter(user=target).exists():
        connection.delete()
        return
    connection.user = target
    connection.save(update_fields=["user"])


@transaction.atomic
def apply_provider_payload(*, target: User, provider_payload: dict[str, Any]) -> None:
    """Link a deferred social connection to the merge target after email confirm."""
    if not provider_payload:
        return

    provider = provider_payload.get("provider")
    if provider == "github":
        UserSocialAccount.objects.update_or_create(
            user=target,
            platform="github",
            external_id=str(provider_payload["external_id"]),
            defaults={
                "username": str(provider_payload.get("username", ""))[:64],
                "display_name": str(provider_payload.get("display_name", ""))[:128],
                "avatar_url": str(provider_payload.get("avatar_url", "")),
                "access_token": str(provider_payload.get("access_token", "")),
            },
        )
        return

    if provider == "twitter":
        TwitterConnection.objects.update_or_create(
            twitter_user_id=str(provider_payload["twitter_user_id"]),
            defaults={
                "user": target,
                "twitter_username": str(provider_payload.get("twitter_username", ""))[:64],
                "display_name": str(provider_payload.get("display_name", ""))[:128],
                "avatar_url": str(provider_payload.get("avatar_url", "")),
                "access_token": str(provider_payload.get("access_token", "")),
                "refresh_token": str(provider_payload.get("refresh_token", "")),
                "token_expires_at": provider_payload.get("token_expires_at"),
                "watch_enabled": bool(provider_payload.get("watch_enabled", True)),
                "last_error": "",
            },
        )
        return

    if provider == "discord":
        DiscordConnection.objects.update_or_create(
            discord_user_id=str(provider_payload["discord_user_id"]),
            defaults={
                "user": target,
                "discord_username": str(provider_payload.get("discord_username", ""))[:64],
                "display_name": str(provider_payload.get("display_name", ""))[:128],
                "avatar_url": str(provider_payload.get("avatar_url", "")),
                "access_token": str(provider_payload.get("access_token", "")),
                "refresh_token": str(provider_payload.get("refresh_token", "")),
                "token_expires_at": provider_payload.get("token_expires_at"),
                "last_error": "",
                "metadata": provider_payload.get("metadata") or {"oauth": True},
            },
        )
        return

    if provider == "telegram":
        TelegramConnection.objects.update_or_create(
            telegram_user_id=str(provider_payload["telegram_user_id"]),
            defaults={
                "user": target,
                "telegram_username": str(provider_payload.get("telegram_username", ""))[:64],
                "display_name": str(provider_payload.get("display_name", ""))[:128],
                "avatar_url": str(provider_payload.get("avatar_url", "")),
            },
        )


def execute_merge(*, target: User, source: User | None = None, email: str | None = None) -> User:
    """Merge source into target. Target retains wallet and gains social links."""
    target = User.objects.select_for_update().get(pk=target.pk)

    if source and source.id != target.id:
        source = User.objects.select_for_update().get(pk=source.pk)

        for model in (TwitterConnection, DiscordConnection, TelegramConnection):
            _reassign_one_to_one(model, source, target)

        for social in UserSocialAccount.objects.filter(user=source):
            conflict = UserSocialAccount.objects.filter(
                user=target,
                platform=social.platform,
                external_id=social.external_id,
            ).exists()
            if conflict:
                social.delete()
            else:
                social.user = target
                social.save(update_fields=["user"])

        Contribution.objects.filter(user=source).update(user=target)
        source.delete()

    if email:
        normalized = normalize_email(email)
        if not target.email:
            target.email = normalized
            target.save(update_fields=["email"])

    return target
