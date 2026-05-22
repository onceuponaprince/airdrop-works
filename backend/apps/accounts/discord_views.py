"""
Discord OAuth start and callback views.
"""

from __future__ import annotations

from django.conf import settings
from django.http import HttpResponseRedirect
from django.utils import timezone
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import DiscordConnection, User
from .discord_oauth import (
    build_discord_authorize_url,
    exchange_discord_code_for_tokens,
    fetch_discord_user,
)


def _discord_callback_url() -> str:
    return str(
        getattr(settings, "DISCORD_OAUTH_CALLBACK_URL", "")
        or f"{getattr(settings, 'SITE_URL', 'http://localhost:8000').rstrip('/')}/api/v1/auth/discord/callback/"
    )


def _frontend_redirect(path: str = "/dashboard?discord=connected") -> str:
    base = str(getattr(settings, "FRONTEND_URL", "http://localhost:3000")).rstrip("/")
    return f"{base}{path}"


class DiscordOAuthStartView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        user_id = None
        if request.user.is_authenticated:
            user_id = str(request.user.id)

        try:
            state = f"discord_{user_id or 'anon'}"
            authorize_url = build_discord_authorize_url(state, _discord_callback_url())
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=503)

        return Response({"authorizeUrl": authorize_url, "state": state})


class DiscordOAuthCallbackView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        code = request.query_params.get("code")
        error = request.query_params.get("error")

        if error:
            return HttpResponseRedirect(_frontend_redirect("/dashboard?error=discord_denied"))

        if not code:
            return Response({"detail": "Missing authorization code"}, status=400)

        try:
            token_data = exchange_discord_code_for_tokens(code, _discord_callback_url())
            access_token = token_data.get("access_token")
            refresh_token = token_data.get("refresh_token")
            expires_in = token_data.get("expires_in", 604800)

            discord_user = fetch_discord_user(access_token)
        except Exception as exc:
            return HttpResponseRedirect(_frontend_redirect(f"/dashboard?error=discord_oauth&detail={str(exc)[:100]}"))

        # Try to find the user from state or fall back to last authenticated pattern
        state = request.query_params.get("state", "")
        user_id = None
        if state.startswith("discord_"):
            user_id = state.replace("discord_", "")

        user = None
        if user_id and user_id != "anon":
            try:
                user = User.objects.get(id=int(user_id))
            except (User.DoesNotExist, ValueError):
                pass

        if not user and request.user.is_authenticated:
            user = request.user

        if not user:
            # Fallback: create or use a placeholder (not ideal, but prevents crash)
            return HttpResponseRedirect(_frontend_redirect("/dashboard?error=no_user_context"))

        # Create or update DiscordConnection
        expires_at = timezone.now() + timezone.timedelta(seconds=expires_in)

        DiscordConnection.objects.update_or_create(
            user=user,
            defaults={
                "discord_user_id": discord_user["id"],
                "discord_username": discord_user.get("username", ""),
                "display_name": discord_user.get("global_name") or discord_user.get("username", ""),
                "avatar_url": f"https://cdn.discordapp.com/avatars/{discord_user['id']}/{discord_user.get('avatar')}.png" if discord_user.get("avatar") else "",
                "access_token": access_token,
                "refresh_token": refresh_token or "",
                "token_expires_at": expires_at,
                "last_synced_at": timezone.now(),
            },
        )

        return HttpResponseRedirect(_frontend_redirect("/dashboard?discord=connected"))