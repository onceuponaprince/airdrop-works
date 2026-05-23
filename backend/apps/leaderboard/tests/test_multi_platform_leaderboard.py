"""Tests for campaign multi-platform leaderboard (UserSocialAccount + XP)."""

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APIClient

import pytest

from apps.accounts.social_models import UserSocialAccount
from apps.profiles.models import Profile

User = get_user_model()


def _wallet(i: int) -> str:
    # 42-char EVM-style address matching existing leaderboard tests.
    return f"0x{'c' * 38}{i:02d}"


@pytest.mark.django_db
def test_multi_platform_leaderboard_empty():
    User.objects.create_user(username="solo", wallet_address=_wallet(0), email="nolink@test")
    client = APIClient()
    resp = client.get(reverse("leaderboard_multi_platform"))
    assert resp.status_code == 200
    assert resp.json() == []


@pytest.mark.django_db
def test_multi_platform_leaderboard_orders_by_total_xp():
    alice = User.objects.create_user(username="alice", wallet_address=_wallet(1), email="a@test")
    bob = User.objects.create_user(username="bob", wallet_address=_wallet(2), email="b@test")

    UserSocialAccount.objects.create(user=alice, platform="twitter", external_id="t1", username="alice")
    UserSocialAccount.objects.create(user=bob, platform="discord", external_id="d1", username="bob")
    UserSocialAccount.objects.create(user=bob, platform="telegram", external_id="tg1", username="bob_tg")

    Profile.objects.filter(user=alice).update(total_xp=50)
    Profile.objects.filter(user=bob).update(total_xp=200)

    client = APIClient()
    resp = client.get(reverse("leaderboard_multi_platform"))
    assert resp.status_code == 200
    rows = resp.json()
    assert len(rows) == 2
    assert rows[0]["rank"] == 1
    assert rows[0]["wallet_address"] == bob.wallet_address
    assert rows[0]["total_xp"] == 200
    assert set(rows[0]["connected_platforms"]) == {"discord", "telegram"}

    assert rows[1]["rank"] == 2
    assert rows[1]["wallet_address"] == alice.wallet_address
    assert rows[1]["platform_count"] == 1


@pytest.mark.django_db
def test_multi_platform_leaderboard_public_no_auth_required():
    u = User.objects.create_user(username="public", wallet_address=_wallet(3), email="pub@test")
    UserSocialAccount.objects.create(user=u, platform="twitter", external_id="t3", username="pub")
    client = APIClient()
    resp = client.get(reverse("leaderboard_multi_platform"))
    assert resp.status_code == 200
    assert resp.json()[0]["wallet_address"] == u.wallet_address
