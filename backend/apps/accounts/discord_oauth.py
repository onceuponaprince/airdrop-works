"""
Discord OAuth2 helpers.
"""

from __future__ import annotations

import httpx
from django.conf import settings


DISCORD_AUTHORIZE_URL = "https://discord.com/api/oauth2/authorize"
DISCORD_TOKEN_URL = "https://discord.com/api/oauth2/token"
DISCORD_USER_URL = "https://discord.com/api/users/@me"


def build_discord_authorize_url(state: str, redirect_uri: str) -> str:
    """Build Discord OAuth2 authorization URL."""
    client_id = getattr(settings, "DISCORD_CLIENT_ID", "")
    if not client_id:
        raise ValueError("DISCORD_CLIENT_ID not configured")

    scope = "identify guilds"
    return (
        f"{DISCORD_AUTHORIZE_URL}"
        f"?client_id={client_id}"
        f"&redirect_uri={redirect_uri}"
        f"&response_type=code"
        f"&scope={scope}"
        f"&state={state}"
    )


def exchange_discord_code_for_tokens(code: str, redirect_uri: str) -> dict:
    """Exchange authorization code for access + refresh tokens."""
    client_id = getattr(settings, "DISCORD_CLIENT_ID", "")
    client_secret = getattr(settings, "DISCORD_CLIENT_SECRET", "")

    if not client_id or not client_secret:
        raise ValueError("Discord client credentials not configured")

    data = {
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": redirect_uri,
    }

    response = httpx.post(
        DISCORD_TOKEN_URL,
        data=data,
        auth=(client_id, client_secret),
        timeout=20,
    )

    if response.status_code >= 400:
        raise ValueError(f"Discord token exchange failed: {response.text[:300]}")

    return response.json()


def fetch_discord_user(access_token: str) -> dict:
    """Fetch the authenticated Discord user."""
    headers = {"Authorization": f"Bearer {access_token}"}
    response = httpx.get(DISCORD_USER_URL, headers=headers, timeout=15)

    if response.status_code >= 400:
        raise ValueError(f"Failed to fetch Discord user: {response.text[:200]}")

    return response.json()