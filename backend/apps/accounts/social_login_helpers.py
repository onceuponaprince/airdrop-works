"""Shared helpers for social OAuth primary login (S3)."""

from __future__ import annotations

from urllib.parse import urlencode

from django.conf import settings

from apps.accounts.models import User
from apps.payments.services import get_or_create_user_sub

from .views import get_tokens_for_user


def frontend_redirect(path: str = "/sources") -> str:
    base = str(settings.FRONTEND_URL or "http://localhost:3000").rstrip("/")
    return f"{base}{path}"


def redirect_with_jwt(session: dict, user: User, *, default_path: str) -> str:
    """Build frontend redirect URL with JWT query params for login mode."""
    redirect_after = session.get("redirect_uri") or frontend_redirect(default_path)
    base = redirect_after.split("?")[0]
    tokens = get_tokens_for_user(user)
    get_or_create_user_sub(user)
    params = urlencode(
        {
            "access": tokens["access"],
            "refresh": tokens["refresh"],
            "created": "1" if session.get("created") else "0",
        }
    )
    provider = session.get("provider", "social")
    return f"{base}?{provider}=login&{params}"


def resolve_social_user(
    session: dict,
    *,
    connection_model,
    platform_id_field: str,
    platform_user_id: str,
    username: str,
    username_prefix: str,
    display_name: str = "",
    avatar_url: str = "",
) -> tuple[User, bool]:
    """
    Link mode: attach to session user_id.
    Login mode: reuse connection owner or create wallet-less user.
    Returns (user, created).
    """
    user_id = session.get("user_id")
    if user_id:
        user = User.objects.get(id=user_id)
        return user, False

    lookup = {platform_id_field: platform_user_id}
    existing = connection_model.objects.filter(**lookup).select_related("user").first()
    if existing:
        return existing.user, False

    safe_username = username or platform_user_id
    candidate = f"{username_prefix}_{safe_username}"[:150]
    if User.objects.filter(username=candidate).exists():
        candidate = User.generate_username()

    user = User.objects.create_user(
        username=candidate,
        display_name=(display_name or safe_username)[:64],
        avatar_url=avatar_url or "",
    )
    session["created"] = True
    return user, True
