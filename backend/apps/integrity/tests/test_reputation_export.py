from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from apps.contributions.models import Contribution
from apps.profiles.models import Profile


class ReputationExportViewTests(TestCase):
    def setUp(self):
        user_model = get_user_model()
        self.wallet = "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd"
        self.user = user_model.objects.create(
            username="export-user",
            wallet_address=self.wallet,
            is_active=True,
        )
        profile, _ = Profile.objects.get_or_create(user=self.user)
        profile.total_xp = 500
        profile.educator_xp = 300
        profile.save(update_fields=["total_xp", "educator_xp", "updated_at"])
        Contribution.objects.create(
            user=self.user,
            platform="github",
            content_text="Shipped a subgraph indexer for quest rewards",
            platform_content_id="gh-1",
            teaching_value=85,
            originality=80,
            community_impact=75,
            total_score=80,
            farming_flag="genuine",
            scored_at=timezone.now(),
        )
        self.client = APIClient()

    def test_export_bundle_shape(self):
        url = reverse("reputation_export", kwargs={"wallet_address": self.wallet})
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["type"], "PortableReputationExport")
        self.assertEqual(data["specVersion"], "1.0.0")
        self.assertEqual(data["walletAddress"], self.wallet)
        self.assertEqual(data["summary"]["contributionCount"], 1)
        self.assertEqual(data["profile"]["totalXp"], 500)
        self.assertEqual(len(data["history"]), 1)
        self.assertEqual(data["meta"]["historyCount"], 1)

    def test_unknown_wallet_404(self):
        url = reverse(
            "reputation_export",
            kwargs={"wallet_address": "0x2222222222222222222222222222222222222222"},
        )
        self.assertEqual(self.client.get(url).status_code, 404)
