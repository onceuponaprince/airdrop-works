from unittest.mock import patch

import pytest
from django.test import override_settings
from django.urls import reverse
from rest_framework.test import APIClient

from apps.judge.marketing import score_marketing_copy


@pytest.mark.django_db
@override_settings(ANTHROPIC_API_KEY="")
def test_score_marketing_copy_heuristic():
    result = score_marketing_copy("Launch now — 50% off. Sign up free.")
    assert result["rubricKey"] == "performance_marketing_v1"
    assert "hook" in result["dimensions"]
    assert result["compositeScore"] >= 0


@pytest.mark.django_db
@override_settings(ANTHROPIC_API_KEY="")
def test_marketing_demo_endpoint():
    client = APIClient()
    url = reverse("judge_marketing_demo")
    response = client.post(url, {"text": "Get started today. No credit card."}, format="json")
    assert response.status_code == 200
    data = response.json()
    assert data["rubricKey"] == "performance_marketing_v1"
    assert data["dimensions"]["clarity"] >= 0


@pytest.mark.django_db
def test_marketing_rubric_seeded():
    from apps.judge.models import ScoringRubric

    rubric = ScoringRubric.objects.filter(key="performance_marketing_v1").first()
    assert rubric is not None
    assert len(rubric.dimension_config.get("dimensions", [])) == 5
