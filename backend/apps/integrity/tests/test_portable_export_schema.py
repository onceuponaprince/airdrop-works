"""Phase 5 Wave 3 — portable export response matches frozen schema."""

import json
from pathlib import Path

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from apps.contributions.models import Contribution
from apps.profiles.models import Profile


def _schema_path() -> Path:
    candidates = [
        Path(__file__).resolve().parents[3].parent
        / "schemas"
        / "reputation"
        / "v1"
        / "portable-export.schema.json",
        Path("/schemas/reputation/v1/portable-export.schema.json"),
    ]
    for path in candidates:
        if path.is_file():
            return path
    raise FileNotFoundError(
        "portable-export.schema.json not found; mount repo schemas/ at /schemas in Docker"
    )


def _required_keys() -> set[str]:
    schema = json.loads(_schema_path().read_text())
    return set(schema["required"])


class PortableExportContractTests(TestCase):
    def setUp(self):
        self.wallet = "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd"
        user_model = get_user_model()
        self.user = user_model.objects.create(
            username="portable-export-contract",
            wallet_address=self.wallet,
            is_active=True,
        )
        profile, _ = Profile.objects.get_or_create(user=self.user)
        profile.total_xp = 100
        profile.save(update_fields=["total_xp", "updated_at"])
        Contribution.objects.create(
            user=self.user,
            platform="twitter",
            content_text="Portable export contract test",
            platform_content_id="tw-export-schema",
            total_score=70,
            farming_flag="genuine",
            scored_at=timezone.now(),
        )
        self.client = APIClient()

    def test_export_response_matches_schema_required_fields(self):
        url = reverse("reputation_export", kwargs={"wallet_address": self.wallet})
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(_required_keys().issubset(set(data.keys())))
        self.assertEqual(data["type"], "PortableReputationExport")

    def test_portable_export_schema_file_metadata(self):
        schema = json.loads(_schema_path().read_text())
        self.assertEqual(schema["title"], "PortableReputationExport")
        self.assertIn("walletAddress", schema["properties"])
