"""
Telegram connection views — deep link + secure token linking + production webhook ingestion.
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
    throttle_scope = "telegram_link"

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


class TelegramWebhookView(APIView):
    """
    Production webhook receiver for a Telegram bot (push model, low latency).

    One-time setup (run by bot operator):
        curl -F "url=https://YOUR_API_HOST/api/v1/auth/telegram/webhook/" \
             -F "secret_token=${TELEGRAM_WEBHOOK_SECRET}" \
             https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook

    Telegram will POST JSON updates (message, channel_post, edited_message, etc.)
    and include the secret in the X-Telegram-Bot-Api-Secret-Token header.

    Behavior:
    - If the sender (from.id) has a linked TelegramConnection → create Contribution
      (deduped by stable platform_content_id) and enqueue AI Judge scoring.
    - Works for DMs, groups, and channels where the bot is a member.
    - Always returns 200 quickly (Telegram requirement).

    This + the deep-link flow gives a complete "connect Telegram → post anywhere the bot can see → earn points" experience.
    """
    permission_classes = [AllowAny]
    throttle_scope = "telegram_webhook"  # bounded via DEFAULT_THROTTLE_RATES in settings

    def post(self, request):
        from django.conf import settings
        from django.utils import timezone as dj_timezone
        import time

        # Secret validation (defense in depth)
        received_secret = request.headers.get("X-Telegram-Bot-Api-Secret-Token", "")
        expected_secret = getattr(settings, "TELEGRAM_WEBHOOK_SECRET", "")
        if expected_secret and received_secret != expected_secret:
            return Response({"ok": True})

        update = request.data or {}
        # Primary sources of user-generated content the bot can observe
        message = update.get("message") or update.get("channel_post")
        if not isinstance(message, dict):
            return Response({"ok": True})

        from_user = message.get("from") or {}
        tg_user_id = str(from_user.get("id", "")).strip()
        text = (message.get("text") or message.get("caption") or "").strip()
        if not tg_user_id or not text:
            return Response({"ok": True})

        conn = TelegramConnection.objects.filter(telegram_user_id=tg_user_id).select_related("user").first()
        if not conn:
            return Response({"ok": True})

        chat = message.get("chat") or {}
        msg_id = message.get("message_id")
        chat_id = chat.get("id")
        username = chat.get("username") or ""

        if username and msg_id:
            content_url = f"https://t.me/{username}/{msg_id}"
        elif chat_id and msg_id:
            numeric = str(chat_id).lstrip("-").lstrip("100")
            content_url = f"https://t.me/c/{numeric}/{msg_id}"
        else:
            content_url = ""

        platform_content_id = f"tg:{chat_id or 'dm'}:{msg_id}" if msg_id else f"tg:{tg_user_id}:{int(time.time())}"

        from apps.contributions.models import Contribution
        from apps.ai_core.tasks import score_contribution_task

        contribution, created = Contribution.objects.get_or_create(
            platform="telegram",
            platform_content_id=platform_content_id,
            defaults={
                "user": conn.user,
                "content_text": text[:4000],
                "content_url": content_url,
            },
        )

        if created:
            score_contribution_task.delay(str(contribution.id))
            conn.last_synced_at = dj_timezone.now()
            conn.last_error = ""
            conn.save(update_fields=["last_synced_at", "last_error", "updated_at"])

        return Response({"ok": True})
