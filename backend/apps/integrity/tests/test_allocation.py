from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from apps.contributions.models import Contribution

from apps.integrity.allocation_service import classify_row


class AllocationServiceTests(TestCase):
    def test_strict_preset_excludes_high_farming(self):
        row = {
            "walletAddress": "0xabc",
            "compositeScore": 80,
            "farmingPercentage": 60,
            "farmingFlag": "farming",
        }
        out = classify_row(row, "airdrop_strict")
        self.assertEqual(out["tier"], "exclude")
        self.assertEqual(out["recommendedAction"], "exclude")
        self.assertEqual(out["allocationWeight"], 0.0)

    def test_genuine_only_allowlist(self):
        row = {
            "walletAddress": "0xabc",
            "compositeScore": 65,
            "farmingPercentage": 5,
            "farmingFlag": "genuine",
        }
        out = classify_row(row, "allowlist_genuine_only")
        self.assertEqual(out["tier"], "A")
        self.assertEqual(out["allocationWeight"], 1.0)

        ambiguous = {**row, "farmingFlag": "ambiguous"}
        out_amb = classify_row(ambiguous, "allowlist_genuine_only")
        self.assertEqual(out_amb["tier"], "exclude")


class IntegrityAllocationApiTests(TestCase):
    def setUp(self):
        user_model = get_user_model()
        self.admin = user_model.objects.create_user(
            username="alloc-admin",
            wallet_address="0x1111111111111111111111111111111111111111",
            is_staff=True,
            is_superuser=True,
        )
        self.genuine_wallet = "0x2222222222222222222222222222222222222222"
        self.farmer_wallet = "0x3333333333333333333333333333333333333333"
        self.genuine_user = user_model.objects.create(
            username="genuine-user",
            wallet_address=self.genuine_wallet,
        )
        self.farmer_user = user_model.objects.create(
            username="farmer-user",
            wallet_address=self.farmer_wallet,
        )
        now = timezone.now()
        Contribution.objects.create(
            user=self.genuine_user,
            platform="twitter",
            content_text="Deep thread",
            platform_content_id="g-1",
            total_score=75,
            farming_flag="genuine",
            scored_at=now,
        )
        Contribution.objects.create(
            user=self.farmer_user,
            platform="twitter",
            content_text="gm gm",
            platform_content_id="f-1",
            total_score=20,
            farming_flag="farming",
            scored_at=now,
        )
        self.client = APIClient()

    def test_policies_list_public(self):
        response = self.client.get(reverse("integrity_policies"))
        self.assertEqual(response.status_code, 200)
        presets = response.json()["presets"]
        self.assertTrue(any(p["key"] == "airdrop_strict" for p in presets))

    def test_staff_allocate_json(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(
            reverse("integrity_allocate"),
            {"preset": "airdrop_strict"},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["preset"], "airdrop_strict")
        self.assertGreaterEqual(data["count"], 2)
        tiers = {row["walletAddress"]: row["tier"] for row in data["results"]}
        self.assertIn(self.genuine_wallet, tiers)
        self.assertIn(self.farmer_wallet, tiers)

    def test_export_with_preset_csv(self):
        """Export with preset is covered in IntegrityExportViewTests; smoke POST allocate tiers."""
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(
            reverse("integrity_allocate"),
            {"preset": "grants_balanced", "format": "csv"},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertIn("text/csv", response["Content-Type"])
        self.assertIn("tier", response.content.decode().splitlines()[0])
