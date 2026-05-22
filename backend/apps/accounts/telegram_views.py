"""
Telegram connection views — deep link + secure token linking.
"""

from __future__ import annotations

from django.utils import timezone
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import TelegramConnection
from .telegram_oauth import (
    generate_telegram_link_token,
    consume_telegram_link_token,
    build_telegram_deep_link,
)


class TelegramDeepLinkView(APIView):
    """
    Returns a secure deep link the user can click.
    The link contains a short-lived token instead of the raw user ID.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        token = generate_telegram_link_token(request.user.id)
        deep_link = build_telegram_deep_link(token)

        return Response({
            "deepLink": deep_link,
            "instructions": "Click the link to open Telegram and start the bot. Your account will be linked automatically.",
            "expiresInMinutes": 10,
        })


class TelegramLinkView(APIView):
    """
    Called by the Telegram bot (or manually for testing) to complete the link.

    Expected payload:
    {
        "link_token": "...",
        "telegram_user_id": "123456789",
        "telegram_username": "alice",
        "display_name": "Alice",
        "avatar_url": "https://..."
    }
    """
    permission_classes = [AllowAny]  # Bot calls this without user session

    def post(self, request):
        token = request.data.get("link_token")
        tg_user_id = request.data.get("telegram_user_id")
        username = request.data.get("telegram_username", "")
        display_name = request.data.get("display_name", "")
        avatar_url = request.data.get("avatar_url", "")

        if not token or not tg_user_id:
            return Response({"detail": "link_token and telegram_user_id are required"}, status=400)

        user_id = consume_telegram_link_token(token)
        if not user_id:
            return Response({"detail": "Invalid or expired link token"}, status=400)

        from apps.accounts.models import User
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({"detail": "User not found"}, status=404)

        TelegramConnection.objects.update_or_create(
            user=user,
            defaults={
                "telegram_user_id": str(tg_user_id),
                "telegram_username": username,
                "display_name": display_name,
                "avatar_url": avatar_url,
                "last_synced_at": timezone.now(),
            },
        )

        return Response({
            "status": "linked",
            "message": "Telegram account connected successfully.",
        })