import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APIClient


@pytest.mark.django_db
def test_public_route_contracts_return_serialized_lists(settings):
    settings.CACHES = {"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}}
    client = APIClient()

    health = client.get(reverse("api_health_check"))
    assert health.status_code in (200, 503)
    assert set(health.json()) == {"status", "db", "redis"}

    quests = client.get(reverse("quest_list"))
    assert quests.status_code == 200
    assert "results" in quests.json()

    leaderboard = client.get(reverse("leaderboard_global"))
    assert leaderboard.status_code == 200
    assert "results" in leaderboard.json()

    rubrics = client.get(reverse("rubric_list_create"))
    assert rubrics.status_code == 200
    assert "results" in rubrics.json()


@pytest.mark.django_db
def test_admin_overview_route_requires_staff_and_serializes_metrics():
    user_model = get_user_model()
    regular = user_model.objects.create_user(
        username="regular-route-user",
        wallet_address="0x8888888888888888888888888888888888888888",
        email="regular-route@example.com",
    )
    admin = user_model.objects.create_user(
        username="admin-route-user",
        wallet_address="0x9999999999999999999999999999999999999999",
        email="admin-route@example.com",
        is_staff=True,
        is_superuser=True,
    )

    client = APIClient()
    assert client.get(reverse("admin_overview")).status_code == 401

    client.force_authenticate(user=regular)
    assert client.get(reverse("admin_overview")).status_code == 403

    client.force_authenticate(user=admin)
    response = client.get(reverse("admin_overview"))

    assert response.status_code == 200
    payload = response.json()
    assert payload["users"] >= 2
    assert "scoredContributions" in payload
    assert "unscoredContributions" in payload
    assert "trackedPlatforms" in payload
