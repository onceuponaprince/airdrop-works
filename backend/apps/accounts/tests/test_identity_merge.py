"""Tests for email-confirm identity merge (S6)."""

from unittest.mock import patch

import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APIClient

from apps.accounts.merge_service import create_merge_token, get_merge_payload
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
