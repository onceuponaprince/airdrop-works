"""
Discord OAuth helpers (minimal skeleton for now).
Real implementation will use discord.py or direct HTTP calls.
"""

from django.conf import settings


def build_discord_authorize_url(state: str, redirect_uri: str) -> str:
    """Build Discord OAuth2 authorization URL."""
    client_id = getattr(settings, "DISCORD_CLIENT_ID", "")
    if not client_id:
        raise ValueError("DISCORD_CLIENT_ID not configured")

    scope = "identify guilds"
    return (
        "https://discord.com/api/oauth2/authorize"
        f"?client_id={client_id}"
        f"&redirect_uri={redirect_uri}"
        f"&response_type=code"
        f"&scope={scope}"
        f"&state={state}"
    )