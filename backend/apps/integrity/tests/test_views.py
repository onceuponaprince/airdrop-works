from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from apps.contributions.models import Contribution


class IntegrityWalletViewTests(TestCase):
    def setUp(self):
        user_model = get_user_model()
        self.wallet = "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd"
        self.user = user_model.objects.create(
            username="integrity-user",
            wallet_address=self.wallet,
            is_active=True,
        )
        self.client = APIClient()
        now = timezone.now()
        Contribution.objects.create(
            user=self.user,
            platform="twitter",
            content_text="Real thread",
            platform_content_id="tw-1",
            teaching_value=80,
            originality=70,
            community_impact=60,
            total_score=72,
            farming_flag="genuine",
            scored_at=now,
        )
        Contribution.objects.create(
            user=self.user,
            platform="twitter",
            content_text="Farm post",
            platform_content_id="tw-2",
            teaching_value=20,
            originality=10,
            community_impact=10,
            total_score=15,
            farming_flag="farming",
            scored_at=now,
        )

    def test_wallet_integrity_bundle(self):
        url = reverse("integrity_wallet", kwargs={"wallet_address": self.wallet})
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["walletAddress"], self.wallet)
        self.assertEqual(data["contributionCount"], 2)
        self.assertEqual(data["farmingPercentage"], 50)
        self.assertIn(data["farmingFlag"], ("genuine", "farming", "ambiguous"))
        self.assertGreater(data["compositeScore"], 0)

    def test_invalid_wallet_returns_400(self):
        url = reverse("integrity_wallet", kwargs={"wallet_address": "not-a-wallet"})
        response = self.client.get(url)
        self.assertEqual(response.status_code, 400)

    def test_unknown_wallet_returns_404(self):
        url = reverse(
            "integrity_wallet",
            kwargs={"wallet_address": "0x1111111111111111111111111111111111111111"},
        )
        response = self.client.get(url)
        self.assertEqual(response.status_code, 404)


class IntegrityExportViewTests(TestCase):
    def setUp(self):
        user_model = get_user_model()
        self.admin = user_model.objects.create(
            username="integrity-admin",
            wallet_address="0x1111111111111111111111111111111111111111",
            is_staff=True,
            is_superuser=True,
        )
        self.user = user_model.objects.create(
            username="integrity-export-user",
            wallet_address="0x2222222222222222222222222222222222222222",
            is_active=True,
        )
        Contribution.objects.create(
            user=self.user,
            platform="reddit",
            content_text="Export me",
            platform_content_id="rd-1",
            total_score=55,
            farming_flag="genuine",
            scored_at=timezone.now(),
        )
        self.client = APIClient()

    def test_staff_json_export(self):
        self.client.force_authenticate(user=self.admin)
        response = self.client.get(reverse("integrity_export"), {"format": "json"})
        self.assertEqual(response.status_code, 200)
        self.assertGreaterEqual(response.json()["count"], 1)

    def test_anonymous_export_forbidden(self):
        response = self.client.get(reverse("integrity_export"))
        self.assertEqual(response.status_code, 401)
