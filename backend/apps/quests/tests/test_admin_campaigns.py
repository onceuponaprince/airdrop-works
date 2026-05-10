import pytest
from rest_framework.test import APIClient


@pytest.mark.django_db
def test_admin_campaigns_list_requires_admin():
    """Anonymous users should not be able to view the admin campaigns list."""
    client = APIClient()
    resp = client.get("/api/quests/admin/campaigns/")
    assert resp.status_code in (401, 403)


@pytest.mark.django_db
def test_admin_campaign_create_requires_admin():
    """Anonymous users should not be able to create campaigns via admin endpoint."""
    client = APIClient()
    payload = {"title": "Test Campaign", "description": "Test"}
    resp = client.post("/api/quests/admin/campaigns/", payload, format="json")
    assert resp.status_code in (401, 403)
