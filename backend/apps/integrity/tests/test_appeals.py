from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from apps.contributions.models import Contribution
from apps.integrity.models import ScoreAppeal


class AppealApiTests(TestCase):
    def setUp(self):
        user_model = get_user_model()
        self.wallet = "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd"
        self.user = user_model.objects.create(
            username="appeal-user",
            wallet_address=self.wallet,
            is_active=True,
        )
        self.staff = user_model.objects.create(
            username="appeal-staff",
            wallet_address="0x1111111111111111111111111111111111111111",
            is_staff=True,
            is_superuser=True,
        )
        self.other = user_model.objects.create(
            username="appeal-other",
            wallet_address="0x2222222222222222222222222222222222222222",
            is_active=True,
        )
        self.client = APIClient()
        now = timezone.now()
        self.scored_farming = Contribution.objects.create(
            user=self.user,
            platform="twitter",
            content_text="Flagged farm post",
            platform_content_id="tw-farm",
            total_score=15,
            farming_flag="farming",
            scored_at=now,
        )
        self.unscored = Contribution.objects.create(
            user=self.user,
            platform="twitter",
            content_text="Not scored yet",
            platform_content_id="tw-pending",
        )
        self.other_contribution = Contribution.objects.create(
            user=self.other,
            platform="twitter",
            content_text="Other user post",
            platform_content_id="tw-other",
            total_score=50,
            farming_flag="genuine",
            scored_at=now,
        )

    def test_create_appeal_success(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post(
            reverse("integrity_appeal_create"),
            {
                "contribution_id": str(self.scored_farming.id),
                "reason": "This thread explains concentrated liquidity with examples.",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 201)
        data = response.json()
        self.assertEqual(data["status"], "pending")
        self.assertEqual(data["snapshotFarmingFlag"], "farming")
        self.assertEqual(data["snapshotCompositeScore"], 15)

    def test_reason_too_short(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post(
            reverse("integrity_appeal_create"),
            {"contribution_id": str(self.scored_farming.id), "reason": "too short"},
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["code"], "reason_too_short")

    def test_duplicate_pending_appeal(self):
        self.client.force_authenticate(user=self.user)
        payload = {
            "contribution_id": str(self.scored_farming.id),
            "reason": "First appeal with enough detail for review.",
        }
        self.client.post(reverse("integrity_appeal_create"), payload, format="json")
        response = self.client.post(reverse("integrity_appeal_create"), payload, format="json")
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["code"], "duplicate")

    def test_not_scored_contribution(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post(
            reverse("integrity_appeal_create"),
            {
                "contribution_id": str(self.unscored.id),
                "reason": "Trying to appeal before the judge has scored it.",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["code"], "not_scored")

    def test_wrong_user_contribution(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post(
            reverse("integrity_appeal_create"),
            {
                "contribution_id": str(self.other_contribution.id),
                "reason": "Cannot appeal someone else's contribution here.",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["code"], "not_found")

    def test_my_appeals_list(self):
        ScoreAppeal.objects.create(
            user=self.user,
            contribution=self.scored_farming,
            subject="contribution",
            reason="Existing pending appeal for list endpoint test.",
            status="pending",
            snapshot_farming_flag="farming",
            snapshot_composite_score=15,
        )
        self.client.force_authenticate(user=self.user)
        response = self.client.get(reverse("integrity_appeals_me"))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()["results"]), 1)

    def test_resolve_upheld_flips_farming_flag(self):
        appeal = ScoreAppeal.objects.create(
            user=self.user,
            contribution=self.scored_farming,
            subject="contribution",
            reason="Staff review should restore genuine status.",
            status="pending",
            snapshot_farming_flag="farming",
            snapshot_composite_score=15,
        )
        self.client.force_authenticate(user=self.staff)
        response = self.client.post(
            reverse("integrity_appeal_resolve", kwargs={"appeal_id": appeal.id}),
            {"status": "upheld", "resolution_note": "Teaching value confirmed."},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "upheld")
        self.scored_farming.refresh_from_db()
        self.assertEqual(self.scored_farming.farming_flag, "genuine")

    def test_resolve_rejected_keeps_farming_flag(self):
        appeal = ScoreAppeal.objects.create(
            user=self.user,
            contribution=self.scored_farming,
            subject="contribution",
            reason="Rejected appeal should not change farming flag.",
            status="pending",
            snapshot_farming_flag="farming",
            snapshot_composite_score=15,
        )
        self.client.force_authenticate(user=self.staff)
        response = self.client.post(
            reverse("integrity_appeal_resolve", kwargs={"appeal_id": appeal.id}),
            {"status": "rejected"},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.scored_farming.refresh_from_db()
        self.assertEqual(self.scored_farming.farming_flag, "farming")

    def test_resolve_already_resolved(self):
        appeal = ScoreAppeal.objects.create(
            user=self.user,
            contribution=self.scored_farming,
            subject="contribution",
            reason="Already resolved appeal cannot be resolved twice.",
            status="rejected",
            snapshot_farming_flag="farming",
            snapshot_composite_score=15,
            resolved_at=timezone.now(),
        )
        self.client.force_authenticate(user=self.staff)
        response = self.client.post(
            reverse("integrity_appeal_resolve", kwargs={"appeal_id": appeal.id}),
            {"status": "upheld"},
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertEqual(response.json()["code"], "already_resolved")

    def test_anonymous_create_forbidden(self):
        response = self.client.post(
            reverse("integrity_appeal_create"),
            {"contribution_id": str(self.scored_farming.id), "reason": "x" * 25},
            format="json",
        )
        self.assertEqual(response.status_code, 401)
