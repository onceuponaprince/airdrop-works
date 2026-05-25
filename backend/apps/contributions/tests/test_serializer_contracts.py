import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from apps.contributions.models import Contribution, CrawlSourceConfig
from apps.contributions.serializers import ContributionSerializer, CrawlSourceConfigSerializer


@pytest.fixture
def user(db):
    return get_user_model().objects.create_user(
        username="contrib-serializer",
        wallet_address="0x7777777777777777777777777777777777777777",
    )


@pytest.mark.django_db
def test_contribution_serializer_outputs_frontend_camel_case_contract(user):
    contribution = Contribution.objects.create(
        user=user,
        platform="twitter",
        content_text="Useful thread",
        content_url="https://x.com/test/status/1",
        platform_content_id="tw-1",
        teaching_value=80,
        originality=70,
        community_impact=75,
        total_score=76,
        farming_flag="genuine",
        farming_explanation="Specific and helpful",
        dimension_explanations={"teaching_value": "Clear"},
        xp_awarded=76,
        scored_at=timezone.now(),
    )

    data = ContributionSerializer(contribution).data

    assert data["contentText"] == "Useful thread"
    assert data["contentUrl"] == "https://x.com/test/status/1"
    assert data["teachingValue"] == 80
    assert data["communityImpact"] == 75
    assert data["totalScore"] == 76
    assert data["farmingFlag"] == "genuine"
    assert data["xpAwarded"] == 76
    assert "content_text" not in data
    assert "total_score" not in data


@pytest.mark.django_db
def test_crawl_source_serializer_read_only_state_and_route_listing(user):
    source = CrawlSourceConfig.objects.create(
        user=user,
        platform="twitter",
        source_key="alice",
        is_active=True,
        cursor="cursor-1",
        metadata={"lastFetchedCount": 4},
    )

    data = CrawlSourceConfigSerializer(source).data
    assert data["platform"] == "twitter"
    assert data["source_key"] == "alice"
    assert data["cursor"] == "cursor-1"
    assert data["metadata"] == {"lastFetchedCount": 4}

    client = APIClient()
    client.force_authenticate(user=user)
    response = client.get(reverse("crawl_source_list_create"))

    assert response.status_code == 200
    assert response.json()["results"][0]["source_key"] == "alice"
