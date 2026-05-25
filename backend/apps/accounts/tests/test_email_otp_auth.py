"""Tests for Supabase email OTP → Django JWT bridge (S2)."""

from unittest.mock import patch

import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APIClient

User = get_user_model()


@pytest.mark.django_db
@patch("apps.accounts.views.fetch_supabase_user")
def test_email_verify_creates_walletless_user(mock_fetch):
    mock_fetch.return_value = {"id": "supabase-uuid", "email": "new@example.com"}

    response = APIClient().post(
        reverse("email_verify"),
        {"access_token": "supabase-access-token"},
        format="json",
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["created"] is True
    assert payload["access"]
    assert payload["refresh"]
    assert payload["user"]["email"] == "new@example.com"
    assert payload["user"]["walletAddress"] is None

    user = User.objects.get(email="new@example.com")
    assert user.wallet_address is None
    assert user.username


@pytest.mark.django_db
@patch("apps.accounts.views.fetch_supabase_user")
def test_email_verify_returns_existing_user(mock_fetch):
    existing = User.objects.create_user(
        username="existing-email-user",
        email="existing@example.com",
    )
    mock_fetch.return_value = {"id": "supabase-uuid", "email": "existing@example.com"}

    response = APIClient().post(
        reverse("email_verify"),
        {"access_token": "supabase-access-token"},
        format="json",
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["created"] is False
    assert payload["user"]["id"] == str(existing.id)


@pytest.mark.django_db
@patch("apps.accounts.views.fetch_supabase_user")
def test_email_verify_rejects_invalid_token(mock_fetch):
    from apps.accounts.supabase_auth import SupabaseAuthError

    mock_fetch.side_effect = SupabaseAuthError("Invalid or expired Supabase token")

    response = APIClient().post(
        reverse("email_verify"),
        {"access_token": "bad-token"},
        format="json",
    )

    assert response.status_code == 401
    assert "access" not in response.json()


@pytest.mark.django_db
def test_email_verify_requires_access_token():
    response = APIClient().post(reverse("email_verify"), {}, format="json")
    assert response.status_code == 400
