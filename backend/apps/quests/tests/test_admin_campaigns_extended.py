from datetime import timedelta

import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from apps.quests.models import Quest


@pytest.fixture
def admin_user(db):
    user_model = get_user_model()
    user = user_model.objects.create_user(
        wallet_address="0xcccccccccccccccccccccccccccccccccccccccc",
        username="campaign-admin",
        email="campaign-admin@phase1.test",
    )
    user.is_staff = True
    user.is_superuser = True
    user.save(update_fields=["is_staff", "is_superuser"])
    return user


@pytest.fixture
def admin_client(admin_user):
    client = APIClient()
    client.force_authenticate(user=admin_user)
    return client


@pytest.mark.django_db
def test_admin_campaign_status_filter_ended_alias(admin_client):
    now = timezone.now()
    Quest.objects.create(
        title="Ended Campaign",
        description="Done",
        project_name="AI(r)Drop",
        difficulty="C",
        reward_pool="500",
        chain="base",
        start_date=now - timedelta(days=30),
        end_date=now - timedelta(days=1),
        status="completed",
    )
    Quest.objects.create(
        title="Active Campaign",
        description="Live",
        project_name="AI(r)Drop",
        difficulty="B",
        reward_pool="500",
        chain="base",
        start_date=now - timedelta(days=1),
        end_date=now + timedelta(days=30),
        status="active",
    )

    response = admin_client.get(reverse("admin_campaigns_list"), {"status": "ended"})
    assert response.status_code == 200
    titles = [row["title"] for row in response.json()["results"]]
    assert "Ended Campaign" in titles
    assert "Active Campaign" not in titles


@pytest.mark.django_db
def test_admin_campaign_duplicate_title_rejected(admin_client):
    now = timezone.now()
    Quest.objects.create(
        title="Unique Title",
        description="First",
        project_name="AI(r)Drop",
        difficulty="D",
        reward_pool="100",
        chain="base",
        start_date=now,
        end_date=now + timedelta(days=7),
        status="upcoming",
    )

    response = admin_client.post(
        reverse("admin_campaigns_list"),
        {
            "title": "Unique Title",
            "description": "Duplicate",
            "projectName": "AI(r)Drop",
            "difficulty": "D",
            "rewardPool": "100",
            "chain": "base",
            "startDate": now.isoformat(),
            "endDate": (now + timedelta(days=7)).isoformat(),
        },
        format="json",
    )
    assert response.status_code == 400


@pytest.mark.django_db
def test_admin_campaign_sort_allowlist(admin_client):
    now = timezone.now()
    for title in ("Zebra", "Alpha"):
        Quest.objects.create(
            title=title,
            description="x",
            project_name="AI(r)Drop",
            difficulty="D",
            reward_pool="1",
            chain="base",
            start_date=now,
            end_date=now + timedelta(days=1),
            status="active",
        )

    response = admin_client.get(reverse("admin_campaigns_list"), {"sort_by": "title"})
    assert response.status_code == 200
    titles = [row["title"] for row in response.json()["results"]]
    assert titles.index("Alpha") < titles.index("Zebra")
