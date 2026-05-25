"""
GitHub OAuth2 helpers.
"""

from __future__ import annotations

import httpx
from django.conf import settings

GITHUB_AUTHORIZE_URL = "https://github.com/login/oauth/authorize"
GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token"
GITHUB_USER_URL = "https://api.github.com/user"
GITHUB_USER_EMAILS_URL = "https://api.github.com/user/emails"


def build_github_authorize_url(state: str, redirect_uri: str) -> str:
    """Build GitHub OAuth authorization URL."""
    client_id = getattr(settings, "GITHUB_CLIENT_ID", "")
    if not client_id:
        raise ValueError("GITHUB_CLIENT_ID not configured")

    scope = "read:user"
    return (
        f"{GITHUB_AUTHORIZE_URL}"
        f"?client_id={client_id}"
        f"&redirect_uri={redirect_uri}"
        f"&scope={scope}"
        f"&state={state}"
    )


def exchange_github_code_for_tokens(code: str, redirect_uri: str) -> dict:
    """Exchange authorization code for access token."""
    client_id = getattr(settings, "GITHUB_CLIENT_ID", "")
    client_secret = getattr(settings, "GITHUB_CLIENT_SECRET", "")

    if not client_id or not client_secret:
        raise ValueError("GitHub client credentials not configured")

    response = httpx.post(
        GITHUB_TOKEN_URL,
        headers={"Accept": "application/json"},
        data={
            "client_id": client_id,
            "client_secret": client_secret,
            "code": code,
            "redirect_uri": redirect_uri,
        },
        timeout=20,
    )

    if response.status_code >= 400:
        raise ValueError(f"GitHub token exchange failed: {response.text[:300]}")

    payload = response.json()
    if payload.get("error"):
        raise ValueError(f"GitHub token exchange failed: {payload.get('error_description', payload['error'])}")

    return payload


def fetch_github_user(access_token: str) -> dict:
    """Fetch the authenticated GitHub user."""
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Accept": "application/vnd.github+json",
    }
    response = httpx.get(GITHUB_USER_URL, headers=headers, timeout=15)

    if response.status_code >= 400:
        raise ValueError(f"Failed to fetch GitHub user: {response.text[:200]}")

    return response.json()


def fetch_github_primary_email(access_token: str) -> str:
    """Return the user's primary verified GitHub email, if any."""
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Accept": "application/vnd.github+json",
    }
    response = httpx.get(GITHUB_USER_EMAILS_URL, headers=headers, timeout=15)
    if response.status_code >= 400:
        return ""

    for entry in response.json():
        if entry.get("primary") and entry.get("verified") and entry.get("email"):
            return str(entry["email"]).strip()
    return ""
