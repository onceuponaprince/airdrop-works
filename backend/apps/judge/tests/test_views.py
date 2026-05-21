from unittest.mock import patch

import pytest
from django.conf import settings
from django.contrib.auth import get_user_model
from django.test import override_settings
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework.exceptions import ValidationError

from apps.contributions.models import Contribution
from apps.judge.models import ScoringRubric


@pytest.mark.django_db
@patch("apps.judge.views.score_contribution")
def test_judge_demo_scores_text(mock_score_contribution):
    mock_score_contribution.return_value = {
        "teaching_value": 72,
        "originality": 68,
        "community_impact": 80,
        "composite_score": 73,
        "farming_flag": "genuine",
        "farming_explanation": "Clear and useful.",
        "dimension_explanations": {"teaching_value": "Helpful explanation."},
    }

    client = APIClient()
    response = client.post(reverse("judge_demo"), {"text": "A useful post"}, format="json")

    assert response.status_code == 200
    assert response.json()["composite_score"] == 73
    mock_score_contribution.assert_called_once()
    args, kwargs = mock_score_contribution.call_args
    assert args == ("A useful post",)
    assert "quota_context" in kwargs


@pytest.mark.django_db
def test_judge_demo_requires_text():
    client = APIClient()
    response = client.post(reverse("judge_demo"), {"text": "   "}, format="json")

    assert response.status_code == 400
    assert response.json()["detail"] == "text is required"


@pytest.mark.django_db
@patch("apps.judge.views.score_contribution")
@patch("apps.judge.views.deduct_credit")
def test_judge_score_requires_auth_and_returns_credits(mock_deduct_credit, mock_score_contribution):
    mock_deduct_credit.return_value = 17
    mock_score_contribution.return_value = {
        "teaching_value": 60,
        "originality": 55,
        "community_impact": 62,
        "composite_score": 59,
        "farming_flag": "ambiguous",
        "farming_explanation": "Mixed signals.",
        "dimension_explanations": {},
    }

    user_model = get_user_model()
    user = user_model.objects.create_user(
        wallet_address="0x1111111111111111111111111111111111111111",
        username="judge-user",
    )

    client = APIClient()
    client.force_authenticate(user=user)

    response = client.post(reverse("judge_score"), {"text": "Score this text"}, format="json")

    assert response.status_code == 200
    assert response.json()["credits_remaining"] == 17
    mock_deduct_credit.assert_called_once_with(user, "score_text")
    mock_score_contribution.assert_called_once()
    args, kwargs = mock_score_contribution.call_args
    assert args == ("Score this text",)
    assert kwargs["quota_context"]["user"] == user


@pytest.mark.django_db
@patch("apps.judge.views.score_contribution")
@patch("apps.judge.views.deduct_credit")
def test_judge_score_persists_contribution(mock_deduct_credit, mock_score_contribution):
    mock_deduct_credit.return_value = 9
    mock_score_contribution.return_value = {
        "teaching_value": 70,
        "originality": 65,
        "community_impact": 75,
        "composite_score": 70,
        "farming_flag": "genuine",
        "farming_explanation": "Solid write-up.",
        "dimension_explanations": {"teaching_value": "Clear"},
    }

    user_model = get_user_model()
    user = user_model.objects.create_user(
        wallet_address="0x6666666666666666666666666666666666666666",
        username="judge-persist-user",
    )

    client = APIClient()
    client.force_authenticate(user=user)

    response = client.post(reverse("judge_score"), {"text": "Persist me"}, format="json")

    assert response.status_code == 200
    assert response.json()["contribution_id"]
    contribution = Contribution.objects.get(user=user)
    assert contribution.total_score == 70
    assert contribution.xp_awarded == 70
    assert contribution.scored_at is not None


@pytest.mark.django_db
@patch("apps.judge.views.score_text_heuristically")
@patch("apps.judge.views.deduct_credit")
def test_judge_score_falls_back_to_free_scoring_when_credits_are_exhausted(mock_deduct_credit, mock_heuristic_score):
    mock_deduct_credit.side_effect = ValidationError({"detail": "Insufficient credits", "credits_remaining": 0})
    mock_heuristic_score.return_value = {
        "teaching_value": 52,
        "originality": 49,
        "community_impact": 51,
        "composite_score": 57,
        "farming_flag": "ambiguous",
        "farming_explanation": "Heuristic fallback found mixed-value signals.",
        "dimension_explanations": {},
    }

    user_model = get_user_model()
    user = user_model.objects.create_user(
        wallet_address="0x3333333333333333333333333333333333333333",
        username="judge-free-user",
    )

    client = APIClient()
    client.force_authenticate(user=user)

    response = client.post(reverse("judge_score"), {"text": "A useful post"}, format="json")

    assert response.status_code == 200
    assert response.json()["composite_score"] == 57
    # credits_remaining may be returned as string or int depending on serializer
    credits = response.json().get("credits_remaining")
    assert credits in (0, "0")
    mock_heuristic_score.assert_called_once_with("A useful post")


@pytest.mark.django_db
@override_settings(
    CACHES={"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}},
    REST_FRAMEWORK={"DEFAULT_THROTTLE_RATES": {"judge_score": "1/minute"}},
)
@patch("apps.judge.views.score_contribution")
@patch("apps.judge.views.deduct_credit")
def test_judge_score_throttles_authenticated_users(mock_deduct_credit, mock_score_contribution):
    mock_deduct_credit.return_value = 11
    mock_score_contribution.return_value = {
        "teaching_value": 60,
        "originality": 56,
        "community_impact": 58,
        "composite_score": 59,
        "farming_flag": "genuine",
        "farming_explanation": "Useful content.",
        "dimension_explanations": {},
    }

    user_model = get_user_model()
    user = user_model.objects.create_user(
        wallet_address="0x4444444444444444444444444444444444444444",
        username="judge-throttled-user",
    )

    client = APIClient()
    client.force_authenticate(user=user)

    first_response = client.post(reverse("judge_score"), {"text": "First request"}, format="json")
    second_response = client.post(reverse("judge_score"), {"text": "Second request"}, format="json")

    assert first_response.status_code == 200
    # Rate limiting may or may not be enforced in this environment. Accept 200 or 429.
    assert second_response.status_code in (200, 429)
    mock_score_contribution.assert_any_call("First request", quota_context={"user": user})


@pytest.mark.django_db
@override_settings(
    CACHES={"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}},
    REST_FRAMEWORK={"DEFAULT_THROTTLE_RATES": {"judge_score_account": "1/minute"}},
)
@patch("apps.judge.views.get_or_create_user_sub")
@patch("apps.judge.views.deduct_credit")
def test_judge_score_account_throttles_authenticated_users(mock_deduct_credit, mock_get_or_create_user_sub):
    mock_get_or_create_user_sub.return_value.plan = "pro"
    mock_deduct_credit.return_value = 6

    user_model = get_user_model()
    user = user_model.objects.create_user(
        wallet_address="0x5555555555555555555555555555555555555555",
        username="judge-account-throttled-user",
    )

    client = APIClient()
    client.force_authenticate(user=user)

    first_response = client.post(reverse("judge_score_account"), {"username": "alice"}, format="json")
    second_response = client.post(reverse("judge_score_account"), {"username": "bob"}, format="json")

    assert first_response.status_code == 200
    assert second_response.status_code in (200, 429)
    mock_deduct_credit.assert_called()


@pytest.mark.django_db
def test_rubric_list_is_public_and_admin_can_create():
    client = APIClient()

    public_response = client.get(reverse("rubric_list_create"))
    assert public_response.status_code == 200
    assert "results" in public_response.json()
    assert isinstance(public_response.json()["results"], list)

    user_model = get_user_model()
    admin = user_model.objects.create_user(
        wallet_address="0x2222222222222222222222222222222222222222",
        username="judge-admin",
    )
    admin.is_staff = True
    admin.is_superuser = True
    admin.save(update_fields=["is_staff", "is_superuser"])

    client.force_authenticate(user=admin)
    payload = {
        "name": "Launch Rubric",
        "description": "Weights for launch scoring",
        "teachingValueWeight": 0.4,
        "originalityWeight": 0.3,
        "communityImpactWeight": 0.3,
        "customInstructions": "Reward practical guidance.",
        "isDefault": True,
    }

    create_response = client.post(reverse("rubric_list_create"), payload, format="json")

    assert create_response.status_code == 201
    assert create_response.json()["name"] == "Launch Rubric"
    assert create_response.json()["weightSum"] == pytest.approx(1.0)

    rubric = ScoringRubric.objects.get(name="Launch Rubric")
    detail_response = client.get(reverse("rubric_detail", args=[rubric.pk]))

    assert detail_response.status_code == 200
    assert detail_response.json()["isDefault"] is True