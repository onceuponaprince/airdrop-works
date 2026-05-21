import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APIClient

from apps.contributions.models import Contribution


@pytest.fixture
def admin_user(db):
    user_model = get_user_model()
    user = user_model.objects.create_user(
        wallet_address="0x1212121212121212121212121212121212121212",
        username="contrib-admin",
        email="contrib-admin@phase1.test",
    )
    user.is_staff = True
    user.is_superuser = True
    user.save(update_fields=["is_staff", "is_superuser"])
    return user


@pytest.mark.django_db
def test_admin_contributions_requires_admin(admin_user):
    user_model = get_user_model()
    contributor = user_model.objects.create_user(
        wallet_address="0x3434343434343434343434343434343434343434",
        username="contrib-user",
        email="contrib-user@phase1.test",
    )
    contribution = Contribution.objects.create(
        user=contributor,
        platform="twitter",
        content_text="tweet",
        total_score=55,
        farming_flag="genuine",
        xp_awarded=10,
    )

    client = APIClient()
    anon = client.get(reverse("admin_contribution_list"))
    assert anon.status_code in (401, 403)

    client.force_authenticate(user=contributor)
    denied = client.get(reverse("admin_contribution_list"))
    assert denied.status_code == 403

    client.force_authenticate(user=admin_user)
    listing = client.get(reverse("admin_contribution_list"))
    assert listing.status_code == 200
    row = listing.json()["results"][0]
    assert row["walletAddress"] == contributor.wallet_address
    assert "userDisplayName" not in row
    assert row["scores"]["teaching_value"] is None or isinstance(row["scores"]["teaching_value"], int)

    detail = client.get(reverse("admin_contribution_detail", args=[contribution.id]))
    assert detail.status_code == 200
    assert detail.json()["id"] == str(contribution.id)


@pytest.mark.django_db
def test_admin_contributions_farming_filter(admin_user):
    user_model = get_user_model()
    contributor = user_model.objects.create_user(
        wallet_address="0x5656565656565656565656565656565656565656",
        username="contrib-user-2",
        email="contrib-user-2@phase1.test",
    )
    Contribution.objects.create(
        user=contributor,
        platform="twitter",
        content_text="farm",
        total_score=10,
        farming_flag="farming",
    )
    Contribution.objects.create(
        user=contributor,
        platform="github",
        content_text="real",
        total_score=90,
        farming_flag="genuine",
    )

    client = APIClient()
    client.force_authenticate(user=admin_user)
    response = client.get(reverse("admin_contribution_list"), {"is_farming": "true"})
    assert response.status_code == 200
    assert len(response.json()["results"]) == 1
    assert response.json()["results"][0]["isFarming"] is True
