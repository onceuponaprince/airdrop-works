import pytest
from django.contrib.auth import get_user_model
from django.test.utils import CaptureQueriesContext
from django.db import connection
from django.urls import reverse
from rest_framework.test import APIClient

from apps.leaderboard.models import LeaderboardEntry


@pytest.mark.django_db
def test_global_leaderboard_query_count_bounded():
    user_model = get_user_model()
    users = []
    for i in range(5):
        users.append(
            user_model.objects.create_user(
                wallet_address=f"0x{'a' * 38}{i:02d}",
                username=f"lb-user-{i}",
                email=f"lb-user-{i}@phase1.test",
            )
        )

    for rank, user in enumerate(users, start=1):
        LeaderboardEntry.objects.create(
            user=user,
            scope="global",
            period="all_time",
            rank=rank,
            xp=100 * rank,
            contribution_count=rank,
        )

    client = APIClient()
    with CaptureQueriesContext(connection) as ctx:
        response = client.get(reverse("leaderboard_global"), {"period": "all_time"})

    assert response.status_code == 200
    assert len(response.json()["results"]) == 5
    assert len(ctx.captured_queries) <= 8
