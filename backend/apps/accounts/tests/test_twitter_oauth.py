import pytest
from django.urls import reverse
from rest_framework.test import APIClient


@pytest.mark.django_db
def test_twitter_start_requires_auth_for_link_mode():
    client = APIClient()
    response = client.get(reverse("twitter_oauth_start"))
    assert response.status_code == 401


@pytest.mark.django_db
def test_twitter_start_login_mode_ok_without_auth(settings):
    settings.TWITTER_CLIENT_ID = "test-client-id"
    client = APIClient()
    response = client.get(reverse("twitter_oauth_start"), {"mode": "login"})
    assert response.status_code == 200
    assert "authorizeUrl" in response.json()
    assert response.json()["mode"] == "login"


@pytest.mark.django_db
def test_twitter_me_requires_auth():
    client = APIClient()
    response = client.get(reverse("twitter_connection"))
    assert response.status_code == 401
