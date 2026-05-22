"""
Telegram connection helpers — deep link + secure token flow.
"""

from __future__ import annotations

import secrets
from django.conf import settings
from django.core.cache import cache


CACHE_PREFIX = "telegram_link:"
CACHE_TTL = 600  # 10 minutes


def generate_telegram_link_token(user_id: int) -> str:
    """Generate a short-lived secure token for linking a Telegram account."""
    token = secrets.token_urlsafe(32)
    cache.set(f"{CACHE_PREFIX}{token}", str(user_id), CACHE_TTL)
    return token


def consume_telegram_link_token(token: str) -> int | None:
    """Validate and consume the link token. Returns the Django user ID if valid."""
    key = f"{CACHE_PREFIX}{token}"
    user_id = cache.get(key)
    if user_id:
        cache.delete(key)
        return int(user_id)
    return None


def build_telegram_deep_link(token: str) -> str:
    """Build the Telegram deep link containing the secure token."""
    bot_username = getattr(settings, "TELEGRAM_BOT_USERNAME", "airdropworks_bot")
    return f"https://t.me/{bot_username}?start=link_{token}"