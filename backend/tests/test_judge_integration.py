"""Integration smoke tests for the Judge (scoring) API endpoints."""
import pytest
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from unittest.mock import patch


@pytest.mark.django_db
class TestJudgeAPIIntegration:
    """Smoke tests for Judge demo and scoring endpoints."""

    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test client."""
        self.client = APIClient()

    @patch("apps.judge.views.score_contribution")
    def test_judge_demo_endpoint_accepts_post(self, mock_score_contribution):
        """POST /api/v1/judge/demo/ should accept text payload and return 200."""
        mock_score_contribution.return_value = {
            "teaching_value": 72,
            "originality": 68,
            "community_impact": 80,
            "composite_score": 73,
            "farming_flag": "genuine",
            "farming_explanation": "Clear and useful.",
            "dimension_explanations": {},
        }
        url = reverse("judge_demo")
        payload = {"text": "This is a test contribution for scoring."}
        response = self.client.post(url, payload, format="json")
        assert response.status_code == status.HTTP_200_OK
        assert "composite_score" in response.data

    @patch("apps.judge.views.score_contribution")
    def test_judge_demo_endpoint_rejects_empty_text(self, mock_score_contribution):
        """POST /api/v1/judge/demo/ without text should return 400."""
        url = reverse("judge_demo")
        response = self.client.post(url, {}, format="json")
        assert response.status_code in (status.HTTP_400_BAD_REQUEST, status.HTTP_503_SERVICE_UNAVAILABLE)

    def test_judge_demo_endpoint_allows_anonymous_access(self):
        """Judge demo should be accessible without authentication (rate-limited)."""
        url = reverse("judge_demo")
        self.client.credentials()
        response = self.client.post(url, {"text": "test"}, format="json")
        assert response.status_code in (
            status.HTTP_200_OK,
            status.HTTP_400_BAD_REQUEST,
            status.HTTP_429_TOO_MANY_REQUESTS,
            status.HTTP_503_SERVICE_UNAVAILABLE,
        )
