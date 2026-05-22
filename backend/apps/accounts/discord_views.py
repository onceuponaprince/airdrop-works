"""
Discord OAuth2 login/link + channel configuration for tracked contribution scoring.
"""

from __future__ import annotations

import logging
from datetime import UTC, datetime, timedelta

from django.conf import settings
from django.core.cache import cache
from django.http import HttpResponseRedirect
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import DiscordConnection, User
from apps.accounts.social_models import UserSocialAccount
from apps.contributions.models import CrawlSourceConfig

from .discord_oauth import (
    build_discord_authorize_url,
    exchange_discord_code_for_tokens,
    fetch_discord_user,
)

logger = logging.getLogger(__name__)

CACHE_PREFIX = "discord_oauth:"
CACHE_TTL = 600


def _discord_callback_url() -> str:
    return str(
        getattr(settings, "DISCORD_OAUTH_CALLBACK_URL", "")
        or f"{getattr(settings, 'SITE_URL', 'http://localhost:8000').rstrip('/')}/api/v1/auth/discord/callback/"
    )


def _frontend_redirect(path: str = "/sources") -> str:
    base = str(getattr(settings, "FRONTEND_URL", "http://localhost:3000")).rstrip("/")
    return f"{base}{path}"


class DiscordOAuthStartView(APIView):
    """Begin Discord OAuth — link for authenticated users (or public for future login mode)."""
    permission_classes = [AllowAny]

    def get(self, request):
        mode = request.query_params.get("mode", "link")
        redirect_after = request.query_params.get("redirect_uri") or _frontend_redirect(
            "/sources?discord=connected"
        )

        user_id = None
        if request.user.is_authenticated:
            user_id = str(request.user.id)
        elif mode != "login":
            return Response(
                {"detail": "Sign in with wallet first or use mode=login"},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        try:
            state = f"dc_{user_id or 'anon'}_{int(datetime.now(UTC).timestamp())}"
            authorize_url = build_discord_authorize_url(state, _discord_callback_url())
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        cache.set(
            f"{CACHE_PREFIX}{state}",
            {
                "user_id": user_id,
                "redirect_uri": redirect_after,
                "mode": mode,
            },
            CACHE_TTL,
        )
        return Response({"authorizeUrl": authorize_url, "state": state, "mode": mode})


class DiscordOAuthCallbackView(APIView):
    """OAuth callback — exchange code, persist DiscordConnection + generic social record, redirect."""
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
            return HttpResponseRedirect(_frontend_redirect("/sources?discord=error&reason=missing_code"))

        session = cache.get(f"{CACHE_PREFIX}{state}")
        cache.delete(f"{CACHE_PREFIX}{state}")
        if not session:
            return HttpResponseRedirect(_frontend_redirect("/sources?discord=error&reason=invalid_state"))

        callback = _discord_callback_url()
        try:
            token_payload = exchange_discord_code_for_tokens(code, callback)
            access_token = token_payload.get("access_token", "")
            refresh_token = token_payload.get("refresh_token", "")
            expires_in = int(token_payload.get("expires_in") or 0)
            discord_user = fetch_discord_user(access_token)
        except ValueError as exc:
            logger.error("[DiscordOAuth] callback failed: %s", exc)
            return HttpResponseRedirect(
                _frontend_redirect(f"/sources?discord=error&reason=token_exchange")
            )

        discord_user_id = str(discord_user.get("id", "")).strip()
        username = str(discord_user.get("username", "")).strip().lower()
        discriminator = str(discord_user.get("discriminator", "")).strip()
        display_name = str(discord_user.get("global_name") or discord_user.get("username") or username)
        avatar_hash = discord_user.get("avatar")
        avatar_url = ""
        if avatar_hash and discord_user_id:
            # Discord CDN avatar
            ext = "gif" if avatar_hash.startswith("a_") else "png"
            avatar_url = f"https://cdn.discordapp.com/avatars/{discord_user_id}/{avatar_hash}.{ext}?size=128"

        if not discord_user_id or not username:
            return HttpResponseRedirect(_frontend_redirect("/sources?discord=error&reason=no_user"))

        user = self._resolve_user(session, discord_user_id, username, discord_user)

        expires_at = None
        if expires_in:
            expires_at = datetime.now(tz=UTC) + timedelta(seconds=expires_in)

        # Dedicated connection for crawling + channel config (metadata)
        connection, _ = DiscordConnection.objects.update_or_create(
            discord_user_id=discord_user_id,
            defaults={
                "user": user,
                "discord_username": username,
                "display_name": display_name,
                "avatar_url": avatar_url,
                "access_token": access_token,
                "refresh_token": refresh_token,
                "token_expires_at": expires_at,
                "last_synced_at": timezone.now(),
                "last_error": "",
            },
        )

        # Also create generic record so it appears in the "Connected Accounts" list + SocialAccountsPanel
        UserSocialAccount.objects.update_or_create(
            user=user,
            platform="discord",
            external_id=discord_user_id,
            defaults={
                "username": username,
                "display_name": display_name,
                "avatar_url": avatar_url,
                "last_synced_at": timezone.now(),
            },
        )

        # Optional: mark a crawl source (for future unified crawler)
        CrawlSourceConfig.objects.update_or_create(
            user=user,
            platform="discord",
            source_key=discord_user_id,
            defaults={"is_active": True, "metadata": {"oauth": True, "watch": True}},
        )

        # TODO: optionally queue an initial sync task here

        redirect_after = session.get("redirect_uri") or _frontend_redirect("/sources?discord=connected")
        if session.get("mode") == "login":
            # For future login mode (not primary now)
            from apps.accounts.views import get_tokens_for_user
            from urllib.parse import urlencode
            tokens = get_tokens_for_user(user)
            params = urlencode(
                {
                    "discord": "login",
                    "access": tokens["access"],
                    "refresh": tokens["refresh"],
                }
            )
            return HttpResponseRedirect(f"{redirect_after.split('?')[0]}?{params}")

        return HttpResponseRedirect(redirect_after)

    def _resolve_user(self, session: dict, discord_user_id: str, username: str, profile: dict) -> User:
        user_id = session.get("user_id")
        if user_id:
            try:
                return User.objects.get(id=user_id)
            except User.DoesNotExist:
                pass

        # If existing connection, reuse its user
        existing = DiscordConnection.objects.filter(discord_user_id=discord_user_id).first()
        if existing:
            return existing.user

        # Create lightweight user (wallet will be linked later or via other means)
        return User.objects.create(
            username=f"dc_{username}"[:150],
            display_name=str(profile.get("global_name") or profile.get("username") or username)[:64],
            avatar_url="",
        )


class UpdateDiscordChannelsView(APIView):
    """Allow a user to set which Discord channel IDs (snowflakes) they want the system to track and score via AI Judge."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        channel_ids = request.data.get("channel_ids", [])
        if not isinstance(channel_ids, list):
            return Response({"detail": "channel_ids must be a list of strings"}, status=400)

        # Clean, dedupe, cap
        clean_ids = list(dict.fromkeys([str(cid).strip() for cid in channel_ids if str(cid).strip()]))[:20]

        conn, _ = DiscordConnection.objects.get_or_create(user=request.user)
        metadata = conn.metadata or {}
        metadata["tracked_channels"] = clean_ids
        conn.metadata = metadata
        conn.save(update_fields=["metadata", "updated_at"])

        # Also ensure a generic social account row exists (for list visibility)
        UserSocialAccount.objects.update_or_create(
            user=request.user,
            platform="discord",
            external_id=conn.discord_user_id or f"manual_{request.user.id}",
            defaults={
                "username": conn.discord_username or "discord",
                "display_name": conn.display_name or "",
                "last_synced_at": timezone.now(),
            },
        )

        return Response({
            "status": "updated",
            "tracked_channels": clean_ids,
            "count": len(clean_ids),
        })
