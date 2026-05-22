"""Phase 5 Wave 0 — API response matches frozen profile-reputation schema."""

import json
from pathlib import Path

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from apps.contributions.models import Contribution

def _schema_path() -> Path:
    candidates = [
        Path(__file__).resolve().parents[3].parent
        / "schemas"
        / "reputation"
        / "v1"
        / "profile-reputation.schema.json",
        Path("/schemas/reputation/v1/profile-reputation.schema.json"),
    ]
    for path in candidates:
        if path.is_file():
            return path
    raise FileNotFoundError(
        "profile-reputation.schema.json not found; mount repo schemas/ at /schemas in Docker"
    )


def _required_keys() -> set[str]:
    schema = json.loads(_schema_path().read_text())
    return set(schema["required"])


class ProfileReputationContractTests(TestCase):
    def setUp(self):
        self.wallet = "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd"
        user_model = get_user_model()
        self.user = user_model.objects.create(
            username="reputation-contract-user",
            wallet_address=self.wallet,
            is_active=True,
        )
        Contribution.objects.create(
            user=self.user,
            platform="twitter",
            content_text="Contract test contribution",
            platform_content_id="tw-contract-1",
            teaching_value=70,
            originality=65,
            community_impact=60,
            total_score=65,
            farming_flag="genuine",
            scored_at=timezone.now(),
        )
        self.client = APIClient()

    def test_wallet_response_matches_schema_required_fields(self):
        url = reverse("integrity_wallet", kwargs={"wallet_address": self.wallet})
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(_required_keys(), set(data.keys()))

    def test_schema_file_exists_and_has_version_metadata(self):
        schema = json.loads(_schema_path().read_text())
        self.assertEqual(schema["title"], "PortableProfileReputation")
        self.assertIn("walletAddress", schema["properties"])
