import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APIClient

from apps.profiles.models import Profile


@pytest.mark.django_db
def test_social_only_user_defaults_to_incomplete_onboarding():
    user = get_user_model().objects.create_user(
        username="social-only",
        email="social@example.com",
    )
    profile = Profile.objects.get(user=user)

    assert profile.onboarding_completed is False
    assert profile.preferred_branch == ""


@pytest.mark.django_db
def test_auth_me_patch_marks_onboarding_complete_and_sets_branch():
    user = get_user_model().objects.create_user(
        username="onboard-user",
        email="onboard@example.com",
        display_name="",
    )
    client = APIClient()
    client.force_authenticate(user=user)

    response = client.patch(
        reverse("user_profile"),
        {
            "display_name": "Scout Player",
            "preferred_branch": "scout",
            "onboarding_completed": True,
        },
        format="json",
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["displayName"] == "Scout Player"
    assert payload["preferredBranch"] == "scout"
    assert payload["onboardingCompleted"] is True

    profile = Profile.objects.get(user=user)
    assert profile.preferred_branch == "scout"
    assert profile.onboarding_completed is True


@pytest.mark.django_db
def test_wallet_verify_marks_onboarding_complete():
    user = get_user_model().objects.create_user(
        username="wallet-user",
        wallet_address="0x1234567890123456789012345678901234567890",
    )
    Profile.objects.filter(user=user).update(onboarding_completed=False)

    from django.test import override_settings

    with override_settings(DEBUG=True, ENFORCE_SIWE=False):
        response = APIClient().post(
            reverse("wallet_verify"),
            {
                "wallet_address": user.wallet_address,
                "message": "dev-bypass",
                "signature": "dev-bypass",
            },
            format="json",
        )

    assert response.status_code == 200
    assert response.json()["user"]["onboardingCompleted"] is True
    assert Profile.objects.get(user=user).onboarding_completed is True
