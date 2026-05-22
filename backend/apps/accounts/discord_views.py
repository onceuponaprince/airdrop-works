"""Discord OAuth linking and channel preferences."""

from __future__ import annotations

import logging
import secrets
from datetime import UTC, datetime, timedelta

from django.conf import settings
from django.core.cache import cache
from django.http import HttpResponseRedirect
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .discord_oauth import (
    build_discord_authorize_url,
    exchange_discord_code_for_tokens,
    fetch_discord_user,
)
from .models import DiscordConnection, User

logger = logging.getLogger(__name__)

CACHE_PREFIX = "discord_oauth:"
CACHE_TTL = 600


def _callback_url() -> str:
    configured = getattr(settings, "DISCORD_OAUTH_CALLBACK_URL", "")
    if configured:
        return str(configured)
    return f"{settings.SITE_URL.rstrip('/')}/api/v1/auth/discord/callback/"


def _frontend_redirect(path: str = "/sources") -> str:
    base = str(settings.FRONTEND_URL or "http://localhost:3000").rstrip("/")
    return f"{base}{path}"


def _discord_avatar_url(user_data: dict) -> str:
    avatar = user_data.get("avatar")
    user_id = user_data.get("id")
    if not avatar or not user_id:
        return ""
    ext = "gif" if str(avatar).startswith("a_") else "png"
    return f"https://cdn.discordapp.com/avatars/{user_id}/{avatar}.{ext}"


class DiscordOAuthStartView(APIView):
    """Begin Discord OAuth linking for the signed-in user."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        redirect_after = request.query_params.get("redirect_uri") or _frontend_redirect(
            "/sources?discord=connected"
        )
        state = secrets.token_urlsafe(32)
        callback = _callback_url()

        try:
            authorize_url = build_discord_authorize_url(
                state=state,
                redirect_uri=callback,
            )
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        cache.set(
            f"{CACHE_PREFIX}{state}",
            {"user_id": str(request.user.id), "redirect_uri": redirect_after},
            CACHE_TTL,
        )
        return Response({"authorizeUrl": authorize_url, "state": state})


class DiscordOAuthCallbackView(APIView):
    """OAuth callback that persists the user's Discord connection."""

    permission_classes = [AllowAny]

    def get(self, request):
        error = request.query_params.get("error")
        if error:
            return HttpResponseRedirect(
                _frontend_redirect(f"/sources?discord=error&reason={error}")
            )

        code = request.query_params.get("code", "").strip()
        state = request.query_params.get("state", "").strip()
        if not code or not state:
            return HttpResponseRedirect(
                _frontend_redirect("/sources?discord=error&reason=missing_code")
            )

        session = cache.get(f"{CACHE_PREFIX}{state}")
        cache.delete(f"{CACHE_PREFIX}{state}")
        if not session:
            return HttpResponseRedirect(
                _frontend_redirect("/sources?discord=error&reason=invalid_state")
            )

        try:
            user = User.objects.get(id=session["user_id"])
            token_payload = exchange_discord_code_for_tokens(
                code=code,
                redirect_uri=_callback_url(),
            )
            access_token = token_payload.get("access_token", "")
            refresh_token = token_payload.get("refresh_token", "")
            expires_in = int(token_payload.get("expires_in") or 0)
            discord_user = fetch_discord_user(access_token)
        except (User.DoesNotExist, ValueError) as exc:
            logger.error("[DiscordOAuth] callback failed: %s", exc)
            return HttpResponseRedirect(
                _frontend_redirect("/sources?discord=error&reason=token_exchange")
            )

        discord_user_id = str(discord_user.get("id", "")).strip()
        username = str(discord_user.get("username", "")).strip()
        display_name = str(discord_user.get("global_name") or username)
        if not discord_user_id or not username:
            return HttpResponseRedirect(
                _frontend_redirect("/sources?discord=error&reason=no_user")
            )

        expires_at = None
        if expires_in:
            expires_at = datetime.now(tz=UTC) + timedelta(seconds=expires_in)

        DiscordConnection.objects.update_or_create(
            discord_user_id=discord_user_id,
            defaults={
                "user": user,
                "discord_username": username,
                "display_name": display_name,
                "avatar_url": _discord_avatar_url(discord_user),
                "access_token": access_token,
                "refresh_token": refresh_token,
                "token_expires_at": expires_at,
                "last_error": "",
                "metadata": {"oauth": True},
            },
        )

        redirect_after = session.get("redirect_uri") or _frontend_redirect(
            "/sources?discord=connected"
        )
        return HttpResponseRedirect(redirect_after)


class UpdateDiscordChannelsView(APIView):
    """Set Discord channel IDs to track and score for the linked account."""

    permission_classes = [IsAuthenticated]
    throttle_scope = "discord_channels_update"

    def post(self, request):
        channel_ids = request.data.get("channel_ids", [])
        if not isinstance(channel_ids, list):
            return Response({"detail": "channel_ids must be a list of strings"}, status=400)

        conn = DiscordConnection.objects.filter(user=request.user).first()
        if not conn:
            return Response({"detail": "Connect Discord first"}, status=400)

        clean_ids = []
        seen = set()
        for channel_id in channel_ids:
            value = str(channel_id).strip()
            if value and value not in seen:
                clean_ids.append(value)
                seen.add(value)

        metadata = conn.metadata or {}
        metadata["tracked_channels"] = clean_ids[:20]
        conn.metadata = metadata
        conn.save(update_fields=["metadata", "updated_at"])

        return Response({
            "status": "updated",
            "tracked_channels": clean_ids[:20],
        })
