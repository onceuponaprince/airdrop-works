import uuid

import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APIClient

from apps.judge.models import ScoringRubric
from apps.quests.models import Quest


@pytest.fixture
def admin_user(db):
    user_model = get_user_model()
    user = user_model.objects.create_user(
        wallet_address="0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        username="rubric-admin",
        email="rubric-admin@phase1.test",
    )
    user.is_staff = True
    user.is_superuser = True
    user.save(update_fields=["is_staff", "is_superuser"])
    return user


@pytest.fixture
def regular_user(db):
    user_model = get_user_model()
    return user_model.objects.create_user(
        wallet_address="0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        username="rubric-user",
        email="rubric-user@phase1.test",
    )


@pytest.fixture
def quest(db):
    from django.utils import timezone
    from datetime import timedelta

    now = timezone.now()
    return Quest.objects.create(
        title="Launch Quest",
        description="Test quest",
        project_name="AI(r)Drop",
        difficulty="B",
        reward_pool="1000",
        chain="base",
        start_date=now,
        end_date=now + timedelta(days=30),
        status="active",
    )


@pytest.mark.django_db
def test_rubric_list_public():
    client = APIClient()
    response = client.get(reverse("rubric_list_create"))
    assert response.status_code == 200


@pytest.mark.django_db
def test_rubric_create_requires_admin(regular_user):
    client = APIClient()
    client.force_authenticate(user=regular_user)
    response = client.post(
        reverse("rubric_list_create"),
        {
            "name": "User Rubric",
            "teachingValueWeight": 0.34,
            "originalityWeight": 0.33,
            "communityImpactWeight": 0.33,
        },
        format="json",
    )
    assert response.status_code == 403


@pytest.mark.django_db
def test_rubric_create_with_quest_and_weight_warning(admin_user, quest):
    client = APIClient()
    client.force_authenticate(user=admin_user)
    rubric_name = f"Quest Rubric {uuid.uuid4().hex[:8]}"
    response = client.post(
        reverse("rubric_list_create"),
        {
            "name": rubric_name,
            "questId": str(quest.id),
            "teachingValueWeight": 0.5,
            "originalityWeight": 0.3,
            "communityImpactWeight": 0.3,
            "isDefault": False,
        },
        format="json",
    )
    assert response.status_code == 201, response.json()
    assert response.json()["campaignId"] == str(quest.id)
    assert "warning" in response.json()

    rubric = ScoringRubric.objects.get(name=rubric_name)
    assert rubric.quest_id == quest.id


@pytest.mark.django_db
def test_rubric_rejects_invalid_quest(admin_user):
    client = APIClient()
    client.force_authenticate(user=admin_user)
    response = client.post(
        reverse("rubric_list_create"),
        {
            "name": "Bad Quest Rubric",
            "questId": "00000000-0000-0000-0000-000000000099",
            "teachingValueWeight": 0.34,
            "originalityWeight": 0.33,
            "communityImpactWeight": 0.33,
        },
        format="json",
    )
    assert response.status_code == 400


@pytest.mark.django_db
def test_rubric_rejects_negative_weight(admin_user):
    client = APIClient()
    client.force_authenticate(user=admin_user)
    response = client.post(
        reverse("rubric_list_create"),
        {
            "name": "Negative Weight",
            "teachingValueWeight": -0.1,
            "originalityWeight": 0.5,
            "communityImpactWeight": 0.5,
        },
        format="json",
    )
    assert response.status_code == 400
