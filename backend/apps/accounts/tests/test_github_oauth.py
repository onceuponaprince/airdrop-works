"""Tests for GitHub OAuth primary login (S4)."""

from unittest.mock import patch

import pytest
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.urls import reverse
from rest_framework.test import APIClient

from apps.accounts.social_models import UserSocialAccount

User = get_user_model()


@pytest.mark.django_db
def test_github_start_login_mode_ok_without_auth(settings):
    settings.GITHUB_CLIENT_ID = "test-github-client"
    client = APIClient()
    response = client.get(reverse("github_oauth_start"), {"mode": "login"})
    assert response.status_code == 200
    assert "authorizeUrl" in response.json()
    assert "github.com/login/oauth/authorize" in response.json()["authorizeUrl"]
    assert response.json()["mode"] == "login"


@pytest.mark.django_db
def test_github_start_link_mode_requires_auth():
    client = APIClient()
    response = client.get(reverse("github_oauth_start"))
    assert response.status_code == 401


@pytest.mark.django_db
@patch("apps.accounts.github_views.exchange_github_code_for_tokens")
@patch("apps.accounts.github_views.fetch_github_user")
def test_github_callback_login_creates_walletless_user(mock_fetch_user, mock_exchange, settings):
    settings.GITHUB_CLIENT_ID = "test-github-client"
    settings.GITHUB_CLIENT_SECRET = "test-github-secret"
    settings.FRONTEND_URL = "http://localhost:3000"

    state = "github-state-login"
    cache.set(
        "github_oauth:github-state-login",
        {"user_id": None, "redirect_uri": "http://localhost:3000/login", "mode": "login"},
        600,
    )
    mock_exchange.return_value = {"access_token": "gh-access", "token_type": "bearer"}
    mock_fetch_user.return_value = {
        "id": 424242,
        "login": "octocat",
        "name": "The Octocat",
        "avatar_url": "https://github.com/octocat.png",
    }

    client = APIClient()
    response = client.get(
        reverse("github_oauth_callback"),
        {"code": "abc", "state": state},
    )

    assert response.status_code == 302
    assert "github=login" in response.url
    assert "access=" in response.url

    user = User.objects.get(username="gh_octocat")
    assert user.wallet_address is None
    account = UserSocialAccount.objects.get(user=user, platform="github")
    assert account.external_id == "424242"
    assert account.username == "octocat"


@pytest.mark.django_db
@patch("apps.accounts.github_views.exchange_github_code_for_tokens")
@patch("apps.accounts.github_views.fetch_github_user")
def test_github_callback_link_mode_uses_authenticated_user(mock_fetch_user, mock_exchange, settings):
    settings.GITHUB_CLIENT_ID = "test-github-client"
    settings.GITHUB_CLIENT_SECRET = "test-github-secret"

    user = User.objects.create_user(
        username="wallet-user",
        wallet_address="0x1234512345123451234512345123451234512345",
    )
    state = "github-state-link"
    cache.set(
        "github_oauth:github-state-link",
        {"user_id": str(user.id), "redirect_uri": "http://localhost:3000/sources", "mode": "link"},
        600,
    )
    mock_exchange.return_value = {"access_token": "gh-access"}
    mock_fetch_user.return_value = {"id": 999, "login": "linkeddev", "name": "Linked Dev"}

    client = APIClient()
    response = client.get(reverse("github_oauth_callback"), {"code": "abc", "state": state})

    assert response.status_code == 302
    account = UserSocialAccount.objects.get(platform="github", external_id="999")
    assert account.user_id == user.id


@pytest.mark.django_db
@patch("apps.accounts.github_views.exchange_github_code_for_tokens")
@patch("apps.accounts.github_views.fetch_github_user")
def test_github_callback_login_reuses_existing_account(mock_fetch_user, mock_exchange, settings):
    settings.GITHUB_CLIENT_ID = "test-github-client"
    settings.GITHUB_CLIENT_SECRET = "test-github-secret"
    settings.FRONTEND_URL = "http://localhost:3000"

    existing = User.objects.create_user(username="gh-existing", email="gh@example.com")
    UserSocialAccount.objects.create(
        user=existing,
        platform="github",
        external_id="5555",
        username="existingdev",
    )

    state = "github-state-reuse"
    cache.set(
        "github_oauth:github-state-reuse",
        {"user_id": None, "redirect_uri": "http://localhost:3000/login", "mode": "login"},
        600,
    )
    mock_exchange.return_value = {"access_token": "gh-access"}
    mock_fetch_user.return_value = {"id": 5555, "login": "existingdev", "name": "Existing Dev"}

    client = APIClient()
    response = client.get(reverse("github_oauth_callback"), {"code": "abc", "state": state})

    assert response.status_code == 302
    assert User.objects.filter(email="gh@example.com").count() == 1
    assert UserSocialAccount.objects.get(platform="github", external_id="5555").user_id == existing.id
