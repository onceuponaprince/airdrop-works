from decimal import Decimal

import pytest
from django.utils import timezone

from apps.quests.models import Quest
from apps.quests.serializers import AdminCampaignSerializer, QuestSerializer


def _quest(**overrides):
    now = timezone.now()
    defaults = {
        "title": "Quality Quest",
        "description": "Find and reward useful posts",
        "project_name": "AI Drop",
        "project_logo_url": "https://example.com/logo.png",
        "difficulty": "B",
        "reward_pool": Decimal("100.500000"),
        "reward_token": "USDC",
        "chain": "base",
        "start_date": now,
        "end_date": now + timezone.timedelta(days=7),
        "max_participants": 100,
        "party_size": 5,
        "status": "active",
    }
    defaults.update(overrides)
    return Quest.objects.create(**defaults)


@pytest.mark.django_db
def test_quest_serializer_outputs_frontend_camel_case_contract():
    quest = _quest()

    data = QuestSerializer(quest).data

    assert data["projectName"] == "AI Drop"
    assert data["projectLogoUrl"] == "https://example.com/logo.png"
    assert data["rewardPool"] == "100.500000"
    assert data["rewardToken"] == "USDC"
    assert data["startDate"]
    assert data["endDate"]
    assert data["maxParticipants"] == 100
    assert data["partySize"] == 5
    assert data["participantCount"] == 0
    assert "project_name" not in data
    assert "reward_pool" not in data


@pytest.mark.django_db
def test_admin_campaign_serializer_accepts_camel_case_input_and_validates_dates():
    now = timezone.now()
    payload = {
        "title": "Admin Campaign",
        "description": "Campaign admin contract",
        "projectName": "Admin DAO",
        "projectLogoUrl": "",
        "difficulty": "A",
        "rewardPool": "25.000000",
        "rewardToken": "USDC",
        "chain": "avalanche",
        "startDate": (now + timezone.timedelta(days=5)).isoformat(),
        "endDate": now.isoformat(),
        "maxParticipants": 10,
        "partySize": 2,
        "status": "upcoming",
    }

    invalid = AdminCampaignSerializer(data=payload)
    assert not invalid.is_valid()
    assert "end_date must be after start_date" in str(invalid.errors)

    payload["endDate"] = (now + timezone.timedelta(days=10)).isoformat()
    valid = AdminCampaignSerializer(data=payload)
    assert valid.is_valid(), valid.errors
    quest = valid.save()

    assert quest.project_name == "Admin DAO"
    assert quest.reward_pool == Decimal("25.000000")
    assert AdminCampaignSerializer(quest).data["projectName"] == "Admin DAO"
