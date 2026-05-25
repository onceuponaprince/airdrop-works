"""Regression tests for wallet-optional User identity (S1)."""

import pytest
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import RefreshToken

from apps.accounts.social_models import UserSocialAccount

User = get_user_model()


@pytest.mark.django_db
def test_create_user_without_wallet():
    user = User.objects.create_user(
        username="email-only-user",
        email="no-wallet@example.com",
    )
    assert user.wallet_address is None
    assert user.is_active

    refresh = RefreshToken.for_user(user)
    assert refresh.access_token is not None


@pytest.mark.django_db
def test_short_address_empty_when_no_wallet():
    user = User.objects.create_user(username="no-wallet-short", email="short@example.com")
    assert user.short_address == ""


@pytest.mark.django_db
def test_social_account_str_without_wallet():
    user = User.objects.create_user(username="social-str-user", email="social@example.com")
    account = UserSocialAccount.objects.create(
        user=user,
        platform="twitter",
        external_id="tw_123",
        username="handle",
    )
    assert str(account) == f"{user.id} - twitter (@handle)"


@pytest.mark.django_db
def test_create_user_with_wallet_only_derives_username():
    wallet = "0x1234512345123451234512345123451234512345"
    user = User.objects.create_user(wallet_address=wallet)
    assert user.username == f"user_w_{wallet[2:14].lower()}"
    assert user.wallet_address == wallet
