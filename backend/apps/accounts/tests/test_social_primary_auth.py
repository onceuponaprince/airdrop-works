"""Tests for social OAuth primary login (S3)."""

from unittest.mock import patch

import pytest
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.urls import reverse
from rest_framework.test import APIClient

from apps.accounts.models import DiscordConnection, TelegramConnection, TwitterConnection
from apps.accounts.telegram_oauth import generate_telegram_link_token
from apps.accounts.views import get_tokens_for_user

User = get_user_model()


@pytest.mark.django_db
def test_discord_start_login_mode_ok_without_auth(settings):
    settings.DISCORD_CLIENT_ID = "test-discord-client"
    client = APIClient()
    response = client.get(reverse("discord_oauth_start"), {"mode": "login"})
    assert response.status_code == 200
    assert "authorizeUrl" in response.json()
    assert response.json()["mode"] == "login"


@pytest.mark.django_db
def test_discord_start_link_mode_requires_auth():
    client = APIClient()
    response = client.get(reverse("discord_oauth_start"))
    assert response.status_code == 401


@pytest.mark.django_db
@patch("apps.accounts.discord_views.exchange_discord_code_for_tokens")
@patch("apps.accounts.discord_views.fetch_discord_user")
def test_discord_callback_login_creates_walletless_user(mock_fetch_user, mock_exchange, settings):
    settings.DISCORD_CLIENT_ID = "test-discord-client"
    settings.FRONTEND_URL = "http://localhost:3000"

    state = "discord-state-login"
    cache.set(
        "discord_oauth:discord-state-login",
        {"user_id": None, "redirect_uri": "http://localhost:3000/login", "mode": "login"},
        600,
    )
    mock_exchange.return_value = {
        "access_token": "dc-access",
        "refresh_token": "dc-refresh",
        "expires_in": 3600,
    }
    mock_fetch_user.return_value = {
        "id": "999888777",
        "username": "loginuser",
        "global_name": "Login User",
    }

    client = APIClient()
    response = client.get(
        reverse("discord_oauth_callback"),
        {"code": "abc", "state": state},
    )

    assert response.status_code == 302
    assert "discord=login" in response.url
    assert "access=" in response.url

    user = User.objects.get(username="dc_loginuser")
    assert user.wallet_address is None
    assert DiscordConnection.objects.filter(user=user, discord_user_id="999888777").exists()


@pytest.mark.django_db
@patch("apps.accounts.discord_views.exchange_discord_code_for_tokens")
@patch("apps.accounts.discord_views.fetch_discord_user")
def test_discord_callback_link_mode_uses_authenticated_user(mock_fetch_user, mock_exchange, settings):
    settings.DISCORD_CLIENT_ID = "test-discord-client"
    user = User.objects.create_user(
        username="wallet-user",
        wallet_address="0x1234512345123451234512345123451234512345",
    )
    state = "discord-state-link"
    cache.set(
        "discord_oauth:discord-state-link",
        {"user_id": str(user.id), "redirect_uri": "http://localhost:3000/sources", "mode": "link"},
        600,
    )
    mock_exchange.return_value = {"access_token": "dc-access", "refresh_token": "", "expires_in": 0}
    mock_fetch_user.return_value = {"id": "111222333", "username": "linked", "global_name": "Linked"}

    client = APIClient()
    response = client.get(reverse("discord_oauth_callback"), {"code": "abc", "state": state})

    assert response.status_code == 302
    assert user.id == DiscordConnection.objects.get(discord_user_id="111222333").user_id


@pytest.mark.django_db
def test_telegram_login_start_returns_poll_key():
    client = APIClient()
    response = client.get(reverse("telegram_deep_link"), {"mode": "login"})
    assert response.status_code == 200
    payload = response.json()
    assert payload["mode"] == "login"
    assert payload["pollKey"]
    assert payload["deepLink"].startswith("https://t.me/")


@pytest.mark.django_db
def test_telegram_login_link_and_poll_complete():
    client = APIClient()
    start = client.get(reverse("telegram_deep_link"), {"mode": "login"}).json()
    poll_key = start["pollKey"]
    token = start["deepLink"].split("link_")[-1]

    link_response = client.post(
        reverse("telegram_link"),
        {
            "link_token": token,
            "telegram_user_id": "424242",
            "telegram_username": "tglogin",
            "display_name": "TG Login",
        },
        format="json",
    )
    assert link_response.status_code == 200
    assert link_response.json()["created"] is True

    poll_response = client.get(reverse("telegram_login_poll"), {"poll_key": poll_key})
    assert poll_response.status_code == 200
    assert poll_response.json()["status"] == "complete"
    assert poll_response.json()["access"]
    assert poll_response.json()["refresh"]

    user = User.objects.get(username="tg_tglogin")
    assert TelegramConnection.objects.filter(user=user, telegram_user_id="424242").exists()


@pytest.mark.django_db
def test_telegram_login_reuses_existing_connection_user():
    existing = User.objects.create_user(username="existing-tg", email="tg@example.com")
    TelegramConnection.objects.create(
        user=existing,
        telegram_user_id="777888",
        telegram_username="oldhandle",
    )

    token, poll_key = generate_telegram_link_token(None, mode="login")
    client = APIClient()
    client.post(
        reverse("telegram_link"),
        {
            "link_token": token,
            "telegram_user_id": "777888",
            "telegram_username": "oldhandle",
        },
        format="json",
    )

    poll = client.get(reverse("telegram_login_poll"), {"poll_key": poll_key}).json()
    assert poll["status"] == "complete"
    assert User.objects.filter(email="tg@example.com").count() == 1


@pytest.mark.django_db
@patch("apps.accounts.twitter_views.exchange_code_for_tokens")
@patch("apps.accounts.twitter_views.fetch_authenticated_user")
def test_twitter_callback_login_reuses_existing_connection(mock_fetch_user, mock_exchange, settings):
    settings.TWITTER_CLIENT_ID = "test-twitter-client"
    settings.FRONTEND_URL = "http://localhost:3000"

    existing = User.objects.create_user(username="tw-existing", email="tw@example.com")
    TwitterConnection.objects.create(
        user=existing,
        twitter_user_id="12345",
        twitter_username="existing",
        access_token="old",
    )

    state = "twitter-state-login"
    cache.set(
        "twitter_oauth:twitter-state-login",
        {
            "user_id": None,
            "code_verifier": "verifier",
            "redirect_uri": "http://localhost:3000/login",
            "mode": "login",
        },
        600,
    )
    mock_exchange.return_value = {
        "access_token": "tw-access",
        "refresh_token": "tw-refresh",
        "expires_in": 3600,
    }
    mock_fetch_user.return_value = {
        "id": "12345",
        "username": "existing",
        "name": "Existing",
    }

    client = APIClient()
    with patch("apps.accounts.twitter_views.sync_twitter_connection_task.delay"):
        response = client.get(reverse("twitter_oauth_callback"), {"code": "abc", "state": state})

    assert response.status_code == 302
    assert TwitterConnection.objects.get(twitter_user_id="12345").user_id == existing.id
    tokens = get_tokens_for_user(existing)
    assert tokens["access"]
