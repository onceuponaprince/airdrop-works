"""
Telegram connection helpers.

Telegram does not use traditional OAuth2 like Twitter/Discord.
Common patterns:
- Bot deep linking (user starts bot with /start <payload>)
- Mini App authentication
- Login Widget (for web)

This module provides a minimal skeleton for deep-link based connection.
"""

from django.conf import settings


def build_telegram_deep_link_payload(user_id: str) -> str:
    """
    Build a payload that can be sent via Telegram deep link.
    Example deep link: https://t.me/YourBot?start=CONNECT_<user_id>
    """
    bot_username = getattr(settings, "TELEGRAM_BOT_USERNAME", "airdropworks_bot")
    return f"https://t.me/{bot_username}?start=CONNECT_{user_id}"


def verify_telegram_auth(data: dict) -> bool:
    """
    Placeholder for Telegram Login Widget signature verification.
    In production, implement HMAC verification using bot token.
    """
    # TODO: Implement real verification
    return True