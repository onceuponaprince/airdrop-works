from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from apps.contributions.models import Contribution
from apps.integrity.models import ScoreAppeal


class ProtocolConsoleApiTests(TestCase):
    def setUp(self):
        user_model = get_user_model()
        self.staff = user_model.objects.create(
            username="console-staff",
            wallet_address="0x1111111111111111111111111111111111111111",
            is_staff=True,
            is_superuser=True,
        )
        self.user = user_model.objects.create(
            username="console-user",
            wallet_address="0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
            is_active=True,
        )
        now = timezone.now()
        Contribution.objects.create(
            user=self.user,
            platform="twitter",
            content_text="Scored for console overview",
            platform_content_id="tw-console",
            total_score=72,
            farming_flag="genuine",
            scored_at=now,
        )
        contribution = Contribution.objects.create(
            user=self.user,
            platform="twitter",
            content_text="Farming for appeals queue",
            platform_content_id="tw-console-farm",
            total_score=10,
            farming_flag="farming",
            scored_at=now,
        )
        ScoreAppeal.objects.create(
            user=self.user,
            contribution=contribution,
            subject="contribution",
            reason="Pending appeal visible in protocol console.",
            status="pending",
            snapshot_farming_flag="farming",
            snapshot_composite_score=10,
        )
        self.client = APIClient()

    def test_console_overview_staff(self):
        self.client.force_authenticate(user=self.staff)
        response = self.client.get(reverse("integrity_console_overview"))
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertGreaterEqual(data["walletsWithScores"], 1)
        self.assertGreaterEqual(data["scoredContributions"], 2)
        self.assertGreaterEqual(data["pendingAppeals"], 1)

    def test_console_wallets_pagination(self):
        self.client.force_authenticate(user=self.staff)
        response = self.client.get(reverse("integrity_console_wallets"), {"limit": 10, "offset": 0})
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertGreaterEqual(data["count"], 1)
        self.assertLessEqual(len(data["results"]), 10)

    def test_console_appeals_status_filter(self):
        self.client.force_authenticate(user=self.staff)
        response = self.client.get(
            reverse("integrity_console_appeals"),
            {"status": "pending", "limit": 20},
        )
        self.assertEqual(response.status_code, 200)
        results = response.json()["results"]
        self.assertGreaterEqual(len(results), 1)
        self.assertTrue(all(r["status"] == "pending" for r in results))

    def test_console_invalid_status(self):
        self.client.force_authenticate(user=self.staff)
        response = self.client.get(
            reverse("integrity_console_appeals"),
            {"status": "invalid"},
        )
        self.assertEqual(response.status_code, 400)

    def test_console_anonymous_forbidden(self):
        response = self.client.get(reverse("integrity_console_overview"))
        self.assertEqual(response.status_code, 401)

    def test_console_wallets_boundary_limits(self):
        """Limit is clamped between 1 and 100; negative offset becomes 0."""
        self.client.force_authenticate(user=self.staff)
        # Excessive limit is clamped
        response = self.client.get(reverse("integrity_console_wallets"), {"limit": 200})
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertLessEqual(data["limit"], 100)
        # Negative offset is clamped
        response = self.client.get(reverse("integrity_console_wallets"), {"offset": -5})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["offset"], 0)

    def test_console_appeals_invalid_limit_offset(self):
        """Non-integer limit or offset returns 400."""
        self.client.force_authenticate(user=self.staff)
        response = self.client.get(
            reverse("integrity_console_appeals"), {"limit": "abc"}
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("integers", response.json()["detail"])
        response = self.client.get(
            reverse("integrity_console_appeals"), {"offset": "xyz"}
        )
        self.assertEqual(response.status_code, 400)
