from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from apps.contributions.models import Contribution


class ReputationHistoryViewTests(TestCase):
    def setUp(self):
        user_model = get_user_model()
        self.wallet = "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd"
        self.user = user_model.objects.create(
            username="history-user",
            wallet_address=self.wallet,
            is_active=True,
        )
        base = timezone.now()
        for i, score in enumerate([50, 70, 90]):
            Contribution.objects.create(
                user=self.user,
                platform="twitter",
                content_text=f"Contribution number {i} with enough text",
                platform_content_id=f"tw-hist-{i}",
                teaching_value=score,
                originality=score - 5,
                community_impact=score - 10,
                total_score=score,
                farming_flag="genuine",
                scored_at=base + timezone.timedelta(minutes=i),
            )
        self.client = APIClient()

    def test_history_returns_newest_first(self):
        url = reverse("reputation_history", kwargs={"wallet_address": self.wallet})
        response = self.client.get(url, {"limit": 2})
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["count"], 3)
        self.assertEqual(data["limit"], 2)
        self.assertEqual(len(data["results"]), 2)
        self.assertEqual(data["results"][0]["compositeScore"], 90)
        self.assertIn("contentPreview", data["results"][0])

    def test_invalid_wallet_400(self):
        url = reverse("reputation_history", kwargs={"wallet_address": "bad"})
        self.assertEqual(self.client.get(url).status_code, 400)

    def test_unknown_wallet_404(self):
        url = reverse(
            "reputation_history",
            kwargs={"wallet_address": "0x1111111111111111111111111111111111111111"},
        )
        self.assertEqual(self.client.get(url).status_code, 404)
