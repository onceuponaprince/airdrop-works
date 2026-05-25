"""Tests for GET /auth/social/me/ (OAuth vs manual merge + connection health)."""

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APIClient

import pytest

from apps.accounts.models import DiscordConnection, TwitterConnection
from apps.accounts.social_models import UserSocialAccount

User = get_user_model()


def _user(i: int = 0):
    return User.objects.create_user(
        username=f"me-user-{i}",
        wallet_address=f"0x{'e' * 38}{i:02d}",
        email=f"me{i}@test.local",
    )


@pytest.mark.django_db
def test_social_me_requires_authentication():
    client = APIClient()
    resp = client.get(reverse("social_me"))
    assert resp.status_code == 401


@pytest.mark.django_db
def test_social_me_prefers_twitter_connection_over_duplicate_generic_row():
    u = _user(1)
    TwitterConnection.objects.create(
        user=u,
        twitter_user_id="tid_1",
        twitter_username="from_oauth",
        access_token="at",
        last_error="",
    )
    UserSocialAccount.objects.create(
        user=u,
        platform="twitter",
        external_id="should_skip",
        username="manual_stale",
    )

    client = APIClient()
    client.force_authenticate(user=u)
    resp = client.get(reverse("social_me"))
    assert resp.status_code == 200
    rows = resp.json()
    assert len(rows) == 1
    assert rows[0]["platform"] == "twitter"
    assert rows[0]["username"] == "from_oauth"


@pytest.mark.django_db
def test_social_me_surfaces_discord_last_error_when_set():
    u = _user(2)
    DiscordConnection.objects.create(
        user=u,
        discord_user_id="d99",
        discord_username="crash",
        access_token="tok",
        last_error="Bot missing channel intent",
    )
    client = APIClient()
    client.force_authenticate(user=u)
    resp = client.get(reverse("social_me"))
    assert resp.status_code == 200
    discord_row = next(r for r in resp.json() if r["platform"] == "discord")
    assert discord_row["last_error"] == "Bot missing channel intent"


@pytest.mark.django_db
def test_social_me_omits_last_error_key_when_empty():
    u = _user(3)
    DiscordConnection.objects.create(
        user=u,
        discord_user_id="d100",
        discord_username="ok",
        access_token="tok",
        last_error="",
    )
    client = APIClient()
    client.force_authenticate(user=u)
    rows = client.get(reverse("social_me")).json()
    assert "last_error" not in rows[0]
