"""Tests for email-confirm identity merge (S6)."""

from unittest.mock import patch

import pytest
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.urls import reverse
from rest_framework.test import APIClient

from apps.accounts.merge_service import create_merge_token, get_merge_payload
from apps.accounts.models import DiscordConnection, TelegramConnection, TwitterConnection
from apps.accounts.social_models import UserSocialAccount

User = get_user_model()


@pytest.mark.django_db
@patch("apps.accounts.merge_service.send_merge_confirmation_email")
@patch("apps.accounts.views.fetch_supabase_user")
def test_email_verify_requires_merge_for_wallet_account(mock_fetch, mock_send_email):
    User.objects.create_user(
        username="wallet-owner",
        email="owner@example.com",
        wallet_address="0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
    )
    mock_fetch.return_value = {"id": "supabase-uuid", "email": "owner@example.com"}

    response = APIClient().post(
        reverse("email_verify"),
        {"access_token": "supabase-access-token"},
        format="json",
    )

    assert response.status_code == 409
    payload = response.json()
    assert payload["mergeRequired"] is True
    assert "access" not in payload
    mock_send_email.assert_called_once()
    assert mock_send_email.call_args[0][0] == "owner@example.com"


@pytest.mark.django_db
@patch("apps.accounts.views.fetch_supabase_user")
def test_email_verify_allows_email_only_relogin(mock_fetch):
    existing = User.objects.create_user(username="email-only", email="solo@example.com")
    mock_fetch.return_value = {"id": "supabase-uuid", "email": "solo@example.com"}

    response = APIClient().post(
        reverse("email_verify"),
        {"access_token": "supabase-access-token"},
        format="json",
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["created"] is False
    assert payload["user"]["id"] == str(existing.id)
    assert payload["access"]


@pytest.mark.django_db
@patch("apps.accounts.merge_service.send_merge_confirmation_email")
def test_confirm_merge_returns_jwt_and_merges_accounts(mock_send_email):
    target = User.objects.create_user(
        username="wallet-target",
        email="merge@example.com",
        wallet_address="0x1111111111111111111111111111111111111111",
    )
    source = User.objects.create_user(username="social-source")
    UserSocialAccount.objects.create(
        user=source,
        platform="github",
        external_id="4242",
        username="dev",
    )

    token = create_merge_token(
        target_user_id=str(target.id),
        source_user_id=str(source.id),
        email="merge@example.com",
        provider="github",
    )

    response = APIClient().post(
        reverse("identity_merge_confirm"),
        {"token": token},
        format="json",
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["merged"] is True
    assert payload["access"]
    assert payload["user"]["walletAddress"] == target.wallet_address.lower()

    target.refresh_from_db()
    assert User.objects.filter(id=source.id).exists() is False
    account = UserSocialAccount.objects.get(platform="github", external_id="4242")
    assert account.user_id == target.id


@pytest.mark.django_db
def test_confirm_merge_token_is_single_use():
    target = User.objects.create_user(
        username="wallet-target",
        email="once@example.com",
        wallet_address="0x2222222222222222222222222222222222222222",
    )
    token = create_merge_token(
        target_user_id=str(target.id),
        email="once@example.com",
    )
    assert get_merge_payload(token) is not None

    client = APIClient()
    first = client.post(reverse("identity_merge_confirm"), {"token": token}, format="json")
    second = client.post(reverse("identity_merge_confirm"), {"token": token}, format="json")

    assert first.status_code == 200
    assert second.status_code == 400
    assert "Invalid or expired" in second.json()["detail"]


@pytest.mark.django_db
@patch("apps.accounts.views.consume_merge_token", return_value=None)
def test_confirm_merge_rejects_expired_token(mock_consume):
    response = APIClient().post(
        reverse("identity_merge_confirm"),
        {"token": "expired-token"},
        format="json",
    )

    assert response.status_code == 400
    mock_consume.assert_called_once_with("expired-token")


@pytest.mark.django_db
@patch("apps.accounts.merge_service.send_merge_confirmation_email")
@patch("apps.accounts.views.fetch_supabase_user")
def test_initiate_merge_for_authenticated_source_user(mock_fetch, mock_send_email):
    target = User.objects.create_user(
        username="wallet-target",
        email="linked@example.com",
        wallet_address="0x3333333333333333333333333333333333333333",
    )
    source = User.objects.create_user(username="current-session")
    mock_fetch.return_value = {"id": "supabase-uuid", "email": "linked@example.com"}

    client = APIClient()
    client.force_authenticate(user=source)
    response = client.post(
        reverse("identity_merge_initiate"),
        {"access_token": "supabase-access-token"},
        format="json",
    )

    assert response.status_code == 202
    assert response.json()["mergeRequired"] is True
    mock_send_email.assert_called_once()
    assert User.objects.filter(id=target.id).exists()
    assert User.objects.filter(id=source.id).exists()


@pytest.mark.django_db
@patch("apps.accounts.merge_service.send_merge_confirmation_email")
@patch("apps.accounts.github_views.fetch_github_primary_email")
@patch("apps.accounts.github_views.fetch_github_user")
@patch("apps.accounts.github_views.exchange_github_code_for_tokens")
def test_github_login_merge_pending_redirects_without_orphan(
    mock_exchange, mock_fetch_user, mock_fetch_email, mock_send_email, settings
):
    settings.GITHUB_CLIENT_ID = "test-github-client"
    settings.GITHUB_CLIENT_SECRET = "test-github-secret"
    settings.FRONTEND_URL = "http://localhost:3000"

    User.objects.create_user(
        username="wallet-owner",
        email="owner@example.com",
        wallet_address="0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
    )

    state = "github-merge-state"
    cache.set(
        "github_oauth:github-merge-state",
        {"user_id": None, "redirect_uri": "http://localhost:3000/login", "mode": "login"},
        600,
    )
    mock_exchange.return_value = {"access_token": "gh-access"}
    mock_fetch_user.return_value = {"id": 777, "login": "newdev", "name": "New Dev"}
    mock_fetch_email.return_value = "owner@example.com"

    response = APIClient().get(
        reverse("github_oauth_callback"),
        {"code": "abc", "state": state},
    )

    assert response.status_code == 302
    assert "merge=pending" in response.url
    assert "owner%40example.com" in response.url
    assert "access=" not in response.url
    assert User.objects.filter(username="gh_newdev").exists() is False
    assert UserSocialAccount.objects.filter(external_id="777").exists() is False
    mock_send_email.assert_called_once()


@pytest.mark.django_db
@patch("apps.accounts.merge_service.send_merge_confirmation_email")
@patch("apps.accounts.discord_views.fetch_discord_user")
@patch("apps.accounts.discord_views.exchange_discord_code_for_tokens")
def test_discord_login_merge_pending_redirects_without_orphan(
    mock_exchange, mock_fetch_user, mock_send_email, settings
):
    settings.DISCORD_CLIENT_ID = "discord-client"
    settings.DISCORD_CLIENT_SECRET = "discord-secret"
    settings.FRONTEND_URL = "http://localhost:3000"

    User.objects.create_user(
        username="wallet-owner",
        email="owner@example.com",
        wallet_address="0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
    )

    state = "discord-merge-state"
    cache.set(
        "discord_oauth:discord-merge-state",
        {"user_id": None, "redirect_uri": "http://localhost:3000/login", "mode": "login"},
        600,
    )
    mock_exchange.return_value = {"access_token": "dc-access", "expires_in": 3600}
    mock_fetch_user.return_value = {
        "id": "888",
        "username": "newdiscord",
        "global_name": "New Discord",
        "email": "owner@example.com",
    }

    response = APIClient().get(
        reverse("discord_oauth_callback"),
        {"code": "abc", "state": state},
    )

    assert response.status_code == 302
    assert "merge=pending" in response.url
    assert "access=" not in response.url
    assert User.objects.filter(username="dc_newdiscord").exists() is False
    assert DiscordConnection.objects.filter(discord_user_id="888").exists() is False
    mock_send_email.assert_called_once()


@pytest.mark.django_db
@patch("apps.accounts.merge_service.send_merge_confirmation_email")
@patch("apps.accounts.twitter_views.fetch_authenticated_user")
@patch("apps.accounts.twitter_views.exchange_code_for_tokens")
def test_twitter_login_merge_pending_redirects_without_orphan(
    mock_exchange, mock_fetch_user, mock_send_email, settings
):
    settings.TWITTER_CLIENT_ID = "twitter-client"
    settings.FRONTEND_URL = "http://localhost:3000"

    User.objects.create_user(
        username="wallet-owner",
        email="owner@example.com",
        wallet_address="0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
    )

    state = "twitter-merge-state"
    cache.set(
        "twitter_oauth:twitter-merge-state",
        {
            "user_id": None,
            "code_verifier": "verifier",
            "redirect_uri": "http://localhost:3000/login",
            "mode": "login",
        },
        600,
    )
    mock_exchange.return_value = {"access_token": "tw-access", "expires_in": 3600}
    mock_fetch_user.return_value = {
        "id": "999",
        "username": "newtwitter",
        "name": "New Twitter",
        "email": "owner@example.com",
    }

    with patch("apps.accounts.twitter_views.sync_twitter_connection_task.delay"):
        response = APIClient().get(
            reverse("twitter_oauth_callback"),
            {"code": "abc", "state": state},
        )

    assert response.status_code == 302
    assert "merge=pending" in response.url
    assert "access=" not in response.url
    assert User.objects.filter(username="tw_newtwitter").exists() is False
    assert TwitterConnection.objects.filter(twitter_user_id="999").exists() is False
    mock_send_email.assert_called_once()


@pytest.mark.django_db
@patch("apps.accounts.merge_service.send_merge_confirmation_email")
def test_telegram_login_merge_pending_poll_without_orphan(mock_send_email):
    User.objects.create_user(
        username="wallet-owner",
        email="owner@example.com",
        wallet_address="0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
    )

    poll_key = "tg-poll-key"
    cache.set(
        "telegram_link:tg-link-token",
        {"mode": "login", "user_id": None, "poll_key": poll_key},
        600,
    )
    cache.set("telegram_login_poll:tg-poll-key", {"status": "pending"}, 600)

    response = APIClient().post(
        reverse("telegram_link"),
        {
            "link_token": "tg-link-token",
            "telegram_user_id": "123456789",
            "telegram_username": "newtg",
            "display_name": "New TG",
            "email": "owner@example.com",
        },
        format="json",
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "merge_pending"
    assert payload["mergeRequired"] is True
    assert User.objects.filter(username="tg_newtg").exists() is False
    assert TelegramConnection.objects.filter(telegram_user_id="123456789").exists() is False
    mock_send_email.assert_called_once()

    poll = APIClient().get(reverse("telegram_login_poll"), {"poll_key": poll_key})
    assert poll.status_code == 200
    assert poll.json()["status"] == "merge_pending"
    assert poll.json()["mergeRequired"] is True


@pytest.mark.django_db
@patch("apps.accounts.merge_service.send_merge_confirmation_email")
def test_confirm_merge_applies_deferred_provider_payload(mock_send_email):
    target = User.objects.create_user(
        username="wallet-target",
        email="merge@example.com",
        wallet_address="0x4444444444444444444444444444444444444444",
    )

    token = create_merge_token(
        target_user_id=str(target.id),
        email="merge@example.com",
        provider="discord",
        provider_payload={
            "provider": "discord",
            "discord_user_id": "424242",
            "discord_username": "dev",
            "display_name": "Dev",
            "avatar_url": "",
            "access_token": "token",
            "refresh_token": "refresh",
            "token_expires_at": None,
            "metadata": {"oauth": True},
        },
    )

    response = APIClient().post(
        reverse("identity_merge_confirm"),
        {"token": token},
        format="json",
    )

    assert response.status_code == 200
    conn = DiscordConnection.objects.get(discord_user_id="424242")
    assert conn.user_id == target.id
