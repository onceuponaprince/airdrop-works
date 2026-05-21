"""Twitter / X OAuth 2.0 PKCE helpers."""

from __future__ import annotations

import base64
import hashlib
import secrets
from urllib.parse import urlencode

import httpx
from django.conf import settings

TWITTER_AUTHORIZE_URL = "https://twitter.com/i/oauth2/authorize"
TWITTER_TOKEN_URL = "https://api.twitter.com/2/oauth2/token"
TWITTER_USER_ME_URL = "https://api.twitter.com/2/users/me?user.fields=profile_image_url,name,username"

DEFAULT_SCOPES = ("tweet.read", "users.read", "offline.access")


def _require_client_config() -> tuple[str, str]:
    client_id = str(settings.TWITTER_CLIENT_ID or "").strip()
    client_secret = str(settings.TWITTER_CLIENT_SECRET or "").strip()
    if not client_id:
        raise ValueError("TWITTER_CLIENT_ID is not configured")
    return client_id, client_secret


def generate_pkce() -> tuple[str, str, str]:
    """Return (state, code_verifier, code_challenge)."""
    code_verifier = secrets.token_urlsafe(64)[:128]
    digest = hashlib.sha256(code_verifier.encode("ascii")).digest()
    code_challenge = base64.urlsafe_b64encode(digest).rstrip(b"=").decode("ascii")
    state = secrets.token_urlsafe(32)
    return state, code_verifier, code_challenge


def build_authorize_url(*, state: str, code_challenge: str, redirect_uri: str) -> str:
    client_id, _ = _require_client_config()
    params = {
        "response_type": "code",
        "client_id": client_id,
        "redirect_uri": redirect_uri,
        "scope": " ".join(DEFAULT_SCOPES),
        "state": state,
        "code_challenge": code_challenge,
        "code_challenge_method": "S256",
    }
    return f"{TWITTER_AUTHORIZE_URL}?{urlencode(params)}"


def exchange_code_for_tokens(*, code: str, code_verifier: str, redirect_uri: str) -> dict:
    client_id, client_secret = _require_client_config()
    data = {
        "grant_type": "authorization_code",
        "code": code,
        "redirect_uri": redirect_uri,
        "code_verifier": code_verifier,
        "client_id": client_id,
    }
    headers = {"Content-Type": "application/x-www-form-urlencoded"}
    auth = None
    if client_secret:
        auth = (client_id, client_secret)
    else:
        data["client_id"] = client_id

    response = httpx.post(
        TWITTER_TOKEN_URL,
        data=data,
        headers=headers,
        auth=auth,
        timeout=20,
    )
    if response.status_code >= 400:
        raise ValueError(f"Twitter token exchange failed: {response.text[:240]}")
    return response.json()


def fetch_authenticated_user(access_token: str) -> dict:
    response = httpx.get(
        TWITTER_USER_ME_URL,
        headers={"Authorization": f"Bearer {access_token}"},
        timeout=15,
    )
    if response.status_code >= 400:
        raise ValueError(f"Twitter user lookup failed: {response.text[:240]}")
    return response.json().get("data") or {}
