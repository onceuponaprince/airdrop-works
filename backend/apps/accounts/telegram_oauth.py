"""
Telegram connection helpers — deep link + secure token flow.
"""

from __future__ import annotations

import secrets
from typing import Any

from django.core.cache import cache

CACHE_PREFIX = "telegram_link:"
LOGIN_POLL_PREFIX = "telegram_login_poll:"
CACHE_TTL = 600  # 10 minutes


def _normalize_session(raw: Any) -> dict | None:
    if raw is None:
        return None
    if isinstance(raw, str):
        return {"mode": "link", "user_id": raw, "poll_key": None}
    if isinstance(raw, dict):
        return raw
    return None


def generate_telegram_link_token(user_id: int | None = None, *, mode: str = "link") -> tuple[str, str | None]:
    """Generate a short-lived secure token. Returns (token, poll_key for login mode)."""
    token = secrets.token_urlsafe(32)
    poll_key = None
    if mode == "login" and user_id is None:
        poll_key = secrets.token_urlsafe(16)
        cache.set(f"{LOGIN_POLL_PREFIX}{poll_key}", {"status": "pending"}, CACHE_TTL)

    payload = {
        "mode": mode,
        "user_id": str(user_id) if user_id else None,
        "poll_key": poll_key,
    }
    cache.set(f"{CACHE_PREFIX}{token}", payload, CACHE_TTL)
    return token, poll_key


def peek_telegram_link_token(token: str) -> dict | None:
    """Read link session without consuming (for bot callback)."""
    return _normalize_session(cache.get(f"{CACHE_PREFIX}{token}"))


def consume_telegram_link_token(token: str) -> dict | None:
    """Validate and consume the link token."""
    key = f"{CACHE_PREFIX}{token}"
    raw = cache.get(key)
    if raw is None:
        return None
    cache.delete(key)
    return _normalize_session(raw)


def complete_telegram_login_poll(poll_key: str, access: str, refresh: str) -> None:
    cache.set(
        f"{LOGIN_POLL_PREFIX}{poll_key}",
        {"status": "complete", "access": access, "refresh": refresh},
        CACHE_TTL,
    )


def get_telegram_login_poll(poll_key: str) -> dict | None:
    return cache.get(f"{LOGIN_POLL_PREFIX}{poll_key}")


def build_telegram_deep_link(token: str) -> str:
    """Build the Telegram deep link containing the secure token."""
    from django.conf import settings

    bot_username = getattr(settings, "TELEGRAM_BOT_USERNAME", "airdropworks_bot")
    return f"https://t.me/{bot_username}?start=link_{token}"
