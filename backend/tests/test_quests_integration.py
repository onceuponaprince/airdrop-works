"""Integration smoke tests for the Quests API endpoints."""
import pytest
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status


@pytest.mark.django_db
class TestQuestsAPIIntegration:
    """Smoke tests for Quest catalog and acceptance endpoints."""

    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup test client and base fixtures."""
        self.client = APIClient()

    def test_quest_list_endpoint_returns_200(self):
        """GET /api/v1/quests/ should return 200 with or without active quests."""
        url = reverse("quest_list")
        response = self.client.get(url)
        assert response.status_code == status.HTTP_200_OK
        # API may return paginated results or a raw list depending on settings
        if isinstance(response.data, dict):
            assert "results" in response.data
            assert isinstance(response.data["results"], list)
        else:
            assert isinstance(response.data, list)

    def test_quest_list_with_difficulty_filter(self):
        """GET /api/v1/quests/?difficulty=easy should filter by difficulty."""
        url = reverse("quest_list")
        response = self.client.get(url, {"difficulty": "easy"})
        assert response.status_code == status.HTTP_200_OK
        if isinstance(response.data, dict):
            assert "results" in response.data
            assert isinstance(response.data["results"], list)
        else:
            assert isinstance(response.data, list)

    def test_quest_detail_endpoint_requires_valid_uuid(self):
        """GET /api/v1/quests/<invalid-uuid>/ should return 404."""
        fake_uuid = "00000000-0000-0000-0000-000000000001"
        url = reverse("quest_detail", kwargs={"pk": fake_uuid})
        response = self.client.get(url)
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_quest_list_endpoint_allows_anonymous_access(self):
        """Quest list should be accessible without authentication."""
        url = reverse("quest_list")
        self.client.credentials()
        response = self.client.get(url)
        assert response.status_code == status.HTTP_200_OK
