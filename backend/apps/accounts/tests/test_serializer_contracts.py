import pytest
from django.contrib.auth import get_user_model
from django.test import override_settings
from django.urls import reverse
from rest_framework.test import APIClient

from apps.accounts.serializers import UserSerializer


@pytest.mark.django_db
def test_user_serializer_exposes_frontend_safe_camel_case_fields():
    user = get_user_model().objects.create_user(
        username="serialize-user",
        wallet_address="0xabcdeabcdeabcdeabcdeabcdeabcdeabcdeabcde",
        email="serialize@example.com",
        display_name="Serialize User",
        avatar_url="https://example.com/avatar.png",
        is_staff=True,
    )

    data = UserSerializer(user).data

    assert data["walletAddress"] == user.wallet_address
    assert data["displayName"] == "Serialize User"
    assert data["avatarUrl"] == "https://example.com/avatar.png"
    assert data["shortAddress"] == "0xabcd...bcde"
    assert data["isStaff"] is True
    assert "password" not in data
    assert "is_superuser" not in data


@pytest.mark.django_db
@override_settings(
    DEBUG=False,
    ENFORCE_SIWE=True,
    QA_WALLET_LOGIN_ENABLED=True,
    QA_WALLET_LOGIN_SECRET="qa-secret",
    QA_WALLET_LOGIN_WALLETS=["0x0000000000000000000000000000000000000001"],
)
def test_wallet_verify_deployed_qa_bypass_serializes_seeded_admin_user():
    user = get_user_model().objects.create_user(
        username="qa-admin-one",
        wallet_address="0x0000000000000000000000000000000000000001",
        is_staff=True,
        is_superuser=True,
    )

    response = APIClient().post(
        reverse("wallet_verify"),
        {
            "wallet_address": user.wallet_address,
            "message": "dev-bypass",
            "signature": "dev-bypass",
        },
        format="json",
        HTTP_X_QA_AUTH_SECRET="qa-secret",
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["created"] is False
    assert payload["user"]["walletAddress"] == user.wallet_address
    assert payload["user"]["isStaff"] is True
    assert payload["access"]
    assert payload["refresh"]


@pytest.mark.django_db
@override_settings(
    DEBUG=False,
    ENFORCE_SIWE=True,
    QA_WALLET_LOGIN_ENABLED=True,
    QA_WALLET_LOGIN_SECRET="qa-secret",
    QA_WALLET_LOGIN_WALLETS=["0x0000000000000000000000000000000000000001"],
)
def test_wallet_verify_deployed_qa_bypass_rejects_missing_secret():
    get_user_model().objects.create_user(
        username="qa-admin-one",
        wallet_address="0x0000000000000000000000000000000000000001",
        is_staff=True,
        is_superuser=True,
    )

    response = APIClient().post(
        reverse("wallet_verify"),
        {
            "wallet_address": "0x0000000000000000000000000000000000000001",
            "message": "dev-bypass",
            "signature": "dev-bypass",
        },
        format="json",
    )

    assert response.status_code == 401
    assert "access" not in response.json()
