from datetime import timedelta

import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient


@pytest.mark.django_db
def test_admin_campaign_create_update_as_admin():
    """Admin user can create and update a campaign via admin endpoints."""
    User = get_user_model()
    admin = User.objects.create_user(wallet_address="0xadmin0001", username="admin")
    admin.is_staff = True
    admin.is_superuser = True
    admin.save()

    client = APIClient()
    client.force_authenticate(user=admin)

    start = timezone.now()
    end = start + timedelta(days=2)

    payload = {
        "title": "Integration Test Campaign",
        "description": "Created by test",
        "projectName": "Test Project",
        "difficulty": "B",
        "rewardPool": "10.0",
        "rewardToken": "TEST",
        "chain": "avalanche",
        "startDate": start.isoformat(),
        "endDate": end.isoformat(),
        "maxParticipants": 100,
        "partySize": 1,
        "status": "upcoming",
    }

    # Create
    resp = client.post(reverse("admin_campaigns_list"), payload, format="json")
    assert resp.status_code in (200, 201), f"Unexpected create status: {resp.status_code} content={resp.content}"

    data = resp.json()
    pk = data.get("id")
    assert pk is not None

    # Update title
    patch = {"title": "Updated Campaign Title"}
    resp2 = client.patch(reverse("admin_campaigns_detail", args=[pk]), patch, format="json")
    assert resp2.status_code in (200, 202), f"Unexpected patch status: {resp2.status_code}"
    updated = resp2.json()
    assert updated.get("title") == "Updated Campaign Title"


@pytest.mark.django_db
def test_non_admin_cannot_create():
    """Authenticated non-admin users cannot create campaigns via admin endpoint."""
    User = get_user_model()
    user = User.objects.create_user(wallet_address="0xuser0001", username="user")
    client = APIClient()
    client.force_authenticate(user=user)

    payload = {"title": "Should Fail", "description": "No perms"}
    resp = client.post(reverse("admin_campaigns_list"), payload, format="json")
    assert resp.status_code in (401, 403)


@pytest.mark.django_db
def test_invalid_dates_rejected():
    """Creating a campaign where end_date <= start_date should return 400."""
    User = get_user_model()
    admin = User.objects.create_user(wallet_address="0xadmin2", username="admin2")
    admin.is_staff = True
    admin.is_superuser = True
    admin.save()

    client = APIClient()
    client.force_authenticate(user=admin)

    start = timezone.now()
    end = start - timedelta(days=1)

    payload = {
        "title": "Invalid Dates",
        "description": "end before start",
        "projectName": "Invalid Dates Project",
        "difficulty": "B",
        "rewardPool": "10",
        "startDate": start.isoformat(),
        "endDate": end.isoformat(),
    }
    resp = client.post(reverse("admin_campaigns_list"), payload, format="json")
    assert resp.status_code == 400


@pytest.mark.django_db
def test_negative_reward_rejected():
    """Negative reward_pool should be rejected by validation."""
    User = get_user_model()
    admin = User.objects.create_user(wallet_address="0xadmin3", username="admin3")
    admin.is_staff = True
    admin.is_superuser = True
    admin.save()

    client = APIClient()
    client.force_authenticate(user=admin)

    start = timezone.now()
    end = start + timedelta(days=1)

    payload = {
        "title": "Negative Reward",
        "description": "Should fail",
        "projectName": "Negative Reward Project",
        "difficulty": "B",
        "rewardPool": "-5",
        "startDate": start.isoformat(),
        "endDate": end.isoformat(),
    }
    resp = client.post(reverse("admin_campaigns_list"), payload, format="json")
    assert resp.status_code == 400


@pytest.mark.django_db
def test_create_with_camelcase_fields():
    """Ensure camelCase input fields are accepted by the admin serializer."""
    User = get_user_model()
    admin = User.objects.create_user(wallet_address="0xadmin4", username="admin4")
    admin.is_staff = True
    admin.is_superuser = True
    admin.save()

    client = APIClient()
    client.force_authenticate(user=admin)

    start = timezone.now()
    end = start + timedelta(days=3)

    payload = {
        "title": "CamelCase Campaign",
        "description": "CamelCase fields",
        "projectName": "Camel Project",
        "difficulty": "A",
        "rewardPool": "15.5",
        "rewardToken": "TKN",
        "startDate": start.isoformat(),
        "endDate": end.isoformat(),
    }

    resp = client.post(reverse("admin_campaigns_list"), payload, format="json")
    assert resp.status_code in (200, 201), f"Unexpected status: {resp.status_code}"
    data = resp.json()
    # Response should include camelCase output fields
    assert "createdAt" in data or "created_at" in data
