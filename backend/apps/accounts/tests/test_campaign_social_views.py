"""Tests for Phase 8 campaign surfaces: Telegram webhook + Discord channel prefs."""

from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APIClient

from apps.accounts.models import DiscordConnection, TelegramConnection
from apps.contributions.models import Contribution

User = get_user_model()


def _telegram_update_payload(chat_id=-100123, msg_id=42, tg_user_id=999888777, text="hello campaign"):
    return {
        "update_id": 1,
        "message": {
            "message_id": msg_id,
            "from": {"id": tg_user_id, "is_bot": False, "first_name": "Test"},
            "chat": {"id": chat_id, "type": "supergroup"},
            "date": 1234567890,
            "text": text,
        },
    }


@pytest.fixture
def user():
    # wallet_address max_length=42 (0x + 40 hex)
    return User.objects.create_user(
        username="campaign-user",
        wallet_address="0x1234512345123451234512345123451234512345",
        email="campaign@example.com",
    )


@pytest.fixture(autouse=True)
def _disable_telegram_webhook_rate_limit(monkeypatch):
    """Avoid ScopedRateThrottle leaking state across parametrized / repeated posts in CI."""
    from apps.accounts.telegram_views import TelegramWebhookView

    monkeypatch.setattr(TelegramWebhookView, "throttle_classes", [])


@pytest.mark.django_db
class TestTelegramWebhookView:
    """Inbound Telegram webhook: secret gate, Contribution upsert + scoring enqueue."""

    def test_linked_user_triggers_score_task_and_contribution(self, user, settings):
        settings.TELEGRAM_WEBHOOK_SECRET = "super-secret-token"
        tg_uid = "123456789"
        TelegramConnection.objects.create(
            user=user,
            telegram_user_id=tg_uid,
            telegram_username="campaign_tg",
        )

        url = reverse("telegram_webhook")
        client = APIClient()
        payload = _telegram_update_payload(tg_user_id=int(tg_uid))

        mock_delay = MagicMock()
        with patch("apps.ai_core.tasks.score_contribution_task.delay", mock_delay):
            response = client.post(
                url,
                payload,
                format="json",
                HTTP_X_TELEGRAM_BOT_API_SECRET_TOKEN="super-secret-token",
            )

        assert response.status_code == 200
        assert response.json() == {"ok": True}

        c = Contribution.objects.get(platform="telegram", platform_content_id="tg:-100123:42")
        assert c.user_id == user.id
        assert "hello campaign" in c.content_text
        mock_delay.assert_called_once_with(str(c.id))

        conn = TelegramConnection.objects.get(user=user)
        assert conn.last_synced_at is not None

    def test_wrong_secret_does_not_ingest(self, user, settings):
        settings.TELEGRAM_WEBHOOK_SECRET = "expected"
        TelegramConnection.objects.create(
            user=user,
            telegram_user_id="555",
            telegram_username="u",
        )
        client = APIClient()
        payload = _telegram_update_payload(tg_user_id=555)

        mock_delay = MagicMock()
        with patch("apps.ai_core.tasks.score_contribution_task.delay", mock_delay):
            response = client.post(
                reverse("telegram_webhook"),
                payload,
                format="json",
                HTTP_X_TELEGRAM_BOT_API_SECRET_TOKEN="wrong",
            )

        assert response.status_code == 200
        assert Contribution.objects.filter(platform="telegram").count() == 0
        mock_delay.assert_not_called()

    def test_unlinked_sender_no_contribution(self, settings):
        settings.TELEGRAM_WEBHOOK_SECRET = ""
        client = APIClient()
        response = client.post(
            reverse("telegram_webhook"),
            _telegram_update_payload(tg_user_id=987654321),
            format="json",
        )

        assert response.status_code == 200
        assert Contribution.objects.count() == 0

    def test_duplicate_delivery_does_not_enqueue_twice(self, user, settings):
        settings.TELEGRAM_WEBHOOK_SECRET = ""
        tg_uid = "444333222"
        TelegramConnection.objects.create(
            user=user,
            telegram_user_id=tg_uid,
            telegram_username="dup",
        )
        payload = _telegram_update_payload(msg_id=7, tg_user_id=int(tg_uid), text="once")
        client = APIClient()

        mock_delay = MagicMock()
        with patch("apps.ai_core.tasks.score_contribution_task.delay", mock_delay):
            client.post(reverse("telegram_webhook"), payload, format="json")
            mock_delay.reset_mock()
            client.post(reverse("telegram_webhook"), payload, format="json")

        assert Contribution.objects.filter(platform_content_id="tg:-100123:7").count() == 1
        mock_delay.assert_not_called()


@pytest.mark.django_db
class TestUpdateDiscordChannelsView:
    def test_requires_discord_connection(self, user):
        client = APIClient()
        client.force_authenticate(user=user)
        response = client.post(
            reverse("discord_update_channels"),
            {"channel_ids": ["111", "222"]},
            format="json",
        )
        assert response.status_code == 400
        assert "Connect Discord first" in (response.json().get("detail") or "")

    def test_persists_tracked_channels(self, user):
        DiscordConnection.objects.create(
            user=user,
            discord_user_id="9001",
            discord_username="collector",
            access_token="x",
            metadata={"oauth": True},
        )
        client = APIClient()
        client.force_authenticate(user=user)
        response = client.post(
            reverse("discord_update_channels"),
            {"channel_ids": [" 111 ", "222", "", "222"]},  # dedupe + strip
            format="json",
        )

        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "updated"
        assert data["tracked_channels"] == ["111", "222"]

        conn = DiscordConnection.objects.get(user=user)
        assert conn.metadata.get("tracked_channels") == ["111", "222"]

    def test_rejects_non_list_channel_ids(self, user):
        DiscordConnection.objects.create(
            user=user,
            discord_user_id="9002",
            discord_username="c",
            access_token="y",
        )
        client = APIClient()
        client.force_authenticate(user=user)
        response = client.post(
            reverse("discord_update_channels"),
            {"channel_ids": "111"},
            format="json",
        )
        assert response.status_code == 400
