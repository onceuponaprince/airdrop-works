"""
Telegram connection views (deep link based).
"""

from __future__ import annotations

from django.conf import settings
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .telegram_oauth import build_telegram_deep_link_payload


class TelegramDeepLinkView(APIView):
    """
    Returns a deep link the user can click to start the Telegram bot
    with a payload containing their user ID.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        payload = build_telegram_deep_link_payload(str(request.user.id))
        return Response({
            "deepLink": payload,
            "instructions": "Open the link to connect your Telegram account via the bot."
        })