import pytest
from django.urls import reverse
from rest_framework.test import APIClient

from apps.judge.models import ScoringRubric


@pytest.mark.django_db
def test_rubric_catalog_lists_keyed_rubrics():
    client = APIClient()
    response = client.get(reverse("rubric_catalog"))
    assert response.status_code == 200
    data = response.json()
    assert data["count"] >= 1
    keys = {r["key"] for r in data["rubrics"]}
    assert "performance_marketing_v1" in keys


@pytest.mark.django_db
def test_rubric_by_key_marketing():
    client = APIClient()
    response = client.get(reverse("rubric_by_key", kwargs={"key": "performance_marketing_v1"}))
    assert response.status_code == 200
    assert response.json()["key"] == "performance_marketing_v1"
    assert "dimensions" in response.json()


@pytest.mark.django_db
def test_rubric_schema_metadata():
    client = APIClient()
    response = client.get(reverse("rubric_schema"))
    assert response.status_code == 200
    body = response.json()
    assert body["specVersion"] == "1.0.0"
    assert "schemaUrl" in body


@pytest.mark.django_db
def test_rubric_by_key_404():
    client = APIClient()
    response = client.get(reverse("rubric_by_key", kwargs={"key": "nonexistent_v99"}))
    assert response.status_code == 404
