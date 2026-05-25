"""
Telegram connection views — deep link + secure token linking + production webhook ingestion.
"""

from __future__ import annotations

from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import TelegramConnection, User
from apps.accounts.social_login_helpers import resolve_social_user
from apps.accounts.views import get_tokens_for_user
from apps.payments.services import get_or_create_user_sub

from .telegram_oauth import (
    build_telegram_deep_link,
    complete_telegram_login_poll,
    complete_telegram_login_poll_merge,
    consume_telegram_link_token,
    generate_telegram_link_token,
    get_telegram_login_poll,
)


class TelegramDeepLinkView(APIView):
    """
    Returns a secure deep link the user can click.
    Link mode requires auth; login mode is public and returns pollKey for JWT polling.
    """

    permission_classes = [AllowAny]

    def get(self, request):
        mode = request.query_params.get("mode", "link")

        if mode == "login":
            token, poll_key = generate_telegram_link_token(None, mode="login")
        else:
            if not request.user.is_authenticated:
                return Response({"detail": "Authentication required"}, status=status.HTTP_401_UNAUTHORIZED)
            token, poll_key = generate_telegram_link_token(request.user.id, mode="link")

        return Response({
            "deepLink": build_telegram_deep_link(token),
            "pollKey": poll_key,
            "mode": mode,
            "instructions": "Open Telegram and start the bot to complete linking.",
            "expiresInMinutes": 10,
        })


class TelegramLoginPollView(APIView):
    """Poll for Telegram login completion after the user starts the bot."""

    permission_classes = [AllowAny]

    def get(self, request):
        poll_key = request.query_params.get("poll_key", "").strip()
        if not poll_key:
            return Response({"detail": "poll_key is required"}, status=status.HTTP_400_BAD_REQUEST)

        payload = get_telegram_login_poll(poll_key)
        if not payload:
            return Response({"status": "expired"}, status=status.HTTP_404_NOT_FOUND)
        if payload.get("status") == "complete":
            return Response(payload)
        if payload.get("status") == "merge_pending":
            return Response(payload)
        return Response({"status": "pending"})


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

    permission_classes = [AllowAny]
    throttle_scope = "telegram_link"

    def post(self, request):
        token = request.data.get("link_token")
        tg_user_id = request.data.get("telegram_user_id")
        username = request.data.get("telegram_username", "")
        display_name = request.data.get("display_name", "")
        avatar_url = request.data.get("avatar_url", "")

        if not token or not tg_user_id:
            return Response({"detail": "link_token and telegram_user_id are required"}, status=400)

        session = consume_telegram_link_token(token)
        if not session:
            return Response({"detail": "Invalid or expired link token"}, status=400)

        mode = session.get("mode", "link")
        tg_user_id = str(tg_user_id)

        if mode == "login":
            session["provider"] = "telegram"
            link_email = str(request.data.get("email") or "").strip()
            provider_payload = {
                "provider": "telegram",
                "telegram_user_id": tg_user_id,
                "telegram_username": username,
                "display_name": display_name,
                "avatar_url": avatar_url,
            }
            user, created = resolve_social_user(
                session,
                connection_model=TelegramConnection,
                platform_id_field="telegram_user_id",
                platform_user_id=tg_user_id,
                username=username or tg_user_id,
                username_prefix="tg",
                display_name=display_name or username,
                avatar_url=avatar_url,
                email=link_email,
                provider_payload=provider_payload,
            )
            if session.get("merge_required"):
                poll_key = session.get("poll_key")
                if poll_key:
                    complete_telegram_login_poll_merge(poll_key, session.get("merge_email", ""))
                return Response(
                    {
                        "status": "merge_pending",
                        "mergeRequired": True,
                        "email": session.get("merge_email", ""),
                        "message": "Confirmation email sent. Check your inbox to link this account.",
                    }
                )
            if user is None:
                return Response({"detail": "Unable to resolve login user"}, status=400)
        else:
            user_id = session.get("user_id")
            if not user_id:
                return Response({"detail": "Invalid link session"}, status=400)
            try:
                user = User.objects.get(id=user_id)
            except User.DoesNotExist:
                return Response({"detail": "User not found"}, status=404)
            created = False

        TelegramConnection.objects.update_or_create(
            telegram_user_id=tg_user_id,
            defaults={
                "user": user,
                "telegram_username": username,
                "display_name": display_name,
                "avatar_url": avatar_url,
                "last_synced_at": timezone.now(),
            },
        )

        if mode == "login":
            poll_key = session.get("poll_key")
            if poll_key:
                tokens = get_tokens_for_user(user)
                get_or_create_user_sub(user)
                complete_telegram_login_poll(poll_key, tokens["access"], tokens["refresh"])

        return Response({
            "status": "linked",
            "created": created,
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
    throttle_scope = "telegram_webhook"

    def post(self, request):
        import time

        from django.conf import settings

        received_secret = request.headers.get("X-Telegram-Bot-Api-Secret-Token", "")
        expected_secret = getattr(settings, "TELEGRAM_WEBHOOK_SECRET", "")
        if expected_secret and received_secret != expected_secret:
            return Response({"ok": True})

        update = request.data or {}
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

        from apps.ai_core.tasks import score_contribution_task
        from apps.contributions.models import Contribution

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
            conn.last_synced_at = timezone.now()
            conn.last_error = ""
            conn.save(update_fields=["last_synced_at", "last_error", "updated_at"])

        return Response({"ok": True})
