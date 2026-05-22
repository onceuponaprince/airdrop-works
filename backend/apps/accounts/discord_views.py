"""
Discord OAuth start and callback views (skeleton).
"""

from __future__ import annotations

from django.conf import settings
from django.http import HttpResponseRedirect
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .discord_oauth import build_discord_authorize_url


def _discord_callback_url() -> str:
    return str(
        getattr(settings, "DISCORD_OAUTH_CALLBACK_URL", "")
        or f"{getattr(settings, 'SITE_URL', 'http://localhost:8000').rstrip('/')}/api/v1/auth/discord/callback/"
    )


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
        # TODO: Exchange code, create/update DiscordConnection, redirect to frontend
        code = request.query_params.get("code")
        if not code:
            return Response({"detail": "Missing code"}, status=400)

        # Placeholder success
        return Response({
            "status": "connected",
            "message": "Discord OAuth callback received. Full implementation pending."
        })