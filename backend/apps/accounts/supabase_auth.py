"""Verify Supabase Auth access tokens server-side."""

from __future__ import annotations

import httpx
from django.conf import settings


class SupabaseAuthError(Exception):
    """Raised when a Supabase access token cannot be verified."""


def _supabase_api_key() -> str:
    return settings.SUPABASE_SERVICE_ROLE_KEY or settings.SUPABASE_ANON_KEY


def fetch_supabase_user(access_token: str) -> dict:
    """Return Supabase user payload for a valid access token."""
    base_url = (settings.SUPABASE_URL or "").rstrip("/")
    api_key = _supabase_api_key()
    if not base_url or not api_key:
        raise SupabaseAuthError("Supabase auth is not configured")

    url = f"{base_url}/auth/v1/user"
    try:
        response = httpx.get(
            url,
            headers={
                "Authorization": f"Bearer {access_token}",
                "apikey": api_key,
            },
            timeout=10.0,
        )
    except httpx.HTTPError as exc:
        raise SupabaseAuthError("Unable to reach Supabase auth") from exc

    if response.status_code != 200:
        raise SupabaseAuthError("Invalid or expired Supabase token")

    payload = response.json()
    email = (payload.get("email") or "").strip().lower()
    if not email:
        raise SupabaseAuthError("Verified Supabase user has no email")

    return {
        "id": payload.get("id"),
        "email": email,
    }
