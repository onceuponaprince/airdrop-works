import pytest
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import override_settings
from django.urls import reverse
from rest_framework.test import APIClient

from apps.contributions.models import Contribution


@pytest.fixture
def admin_user(db):
    user_model = get_user_model()
    user = user_model.objects.create_user(
        wallet_address="0xdddddddddddddddddddddddddddddddddddddddd",
        username="stats-admin",
        email="stats-admin@phase1.test",
    )
    user.is_staff = True
    user.is_superuser = True
    user.save(update_fields=["is_staff", "is_superuser"])
    return user


@pytest.mark.django_db
@override_settings(
    CACHES={"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}}
)
def test_admin_stats_requires_admin(admin_user):
    client = APIClient()
    anon = client.get(reverse("admin_stats"))
    assert anon.status_code in (401, 403)

    user_model = get_user_model()
    regular = user_model.objects.create_user(
        wallet_address="0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
        username="stats-user",
        email="stats-user@phase1.test",
    )
    client.force_authenticate(user=regular)
    denied = client.get(reverse("admin_stats"))
    assert denied.status_code == 403

    client.force_authenticate(user=admin_user)
    cache.clear()
    response = client.get(reverse("admin_stats"))
    assert response.status_code == 200
    body = response.json()
    assert body["total_contributions"] == 0
    assert body["farming_rate"] == 0.0
    assert body["score_distribution"]["0_20"] == 0


@pytest.mark.django_db
@override_settings(
    CACHES={"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}}
)
def test_admin_stats_aggregates_and_caches(admin_user):
    user_model = get_user_model()
    contributor = user_model.objects.create_user(
        wallet_address="0xffffffffffffffffffffffffffffffffffffffff",
        username="contributor",
        email="contributor@phase1.test",
    )

    Contribution.objects.create(
        user=contributor,
        platform="twitter",
        content_text="hello",
        total_score=85,
        farming_flag="genuine",
        xp_awarded=100,
        teaching_value=80,
        originality=70,
        community_impact=90,
    )
    Contribution.objects.create(
        user=contributor,
        platform="github",
        content_text="code",
        total_score=15,
        farming_flag="farming",
        xp_awarded=10,
        teaching_value=10,
        originality=10,
        community_impact=10,
    )

    client = APIClient()
    client.force_authenticate(user=admin_user)
    cache.clear()

    first = client.get(reverse("admin_stats"))
    assert first.status_code == 200
    body = first.json()
    assert body["total_contributions"] == 2
    assert body["unique_contributors"] == 1
    assert body["farming_rate"] == 0.5
    assert body["platform_breakdown"]["twitter"] == 1
    assert body["platform_breakdown"]["github"] == 1
    assert len(body["top_contributors"]) == 1

    second = client.get(reverse("admin_stats"))
    assert second.status_code == 200
    assert second.json() == body
