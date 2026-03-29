from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APITestCase

from apps.contributions.models import Contribution


class AICoreScoreViewTests(APITestCase):
    def setUp(self):
        user_model = get_user_model()
        self.user = user_model.objects.create(
            username="ai-core-user",
            wallet_address="0x1111111111111111111111111111111111111111",
            is_active=True,
        )

    @patch("apps.ai_core.views.AICoreScoringService.score_text")
    def test_score_success(self, score_text_mock):
        score_text_mock.return_value.to_dict.return_value = {
            "teaching_value": 70,
            "originality": 65,
            "community_impact": 72,
            "composite_score": 69,
            "farming_flag": "genuine",
            "farming_explanation": "Solid contribution.",
            "dimension_explanations": {
                "teaching_value": "Good explanations.",
                "originality": "Some unique points.",
                "community_impact": "Useful to readers.",
            },
        }

        self.client.force_authenticate(user=self.user)
        response = self.client.post(reverse("ai_core_score"), {"text": "A useful post"}, format="json")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["farming_flag"], "genuine")

    def test_score_requires_authentication(self):
        response = self.client.post(reverse("ai_core_score"), {"text": "A useful post"}, format="json")
        self.assertEqual(response.status_code, 401)

    def test_score_validates_text(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post(reverse("ai_core_score"), {"text": "   "}, format="json")
        self.assertEqual(response.status_code, 400)


class AICoreScoreJobViewTests(APITestCase):
    def setUp(self):
        user_model = get_user_model()
        self.user = user_model.objects.create(
            username="ai-core-job-user",
            wallet_address="0x3333333333333333333333333333333333333333",
            is_active=True,
        )
        self.other_user = user_model.objects.create(
            username="ai-core-job-other",
            wallet_address="0x4444444444444444444444444444444444444444",
            is_active=True,
        )
        self.mine = Contribution.objects.create(
            user=self.user,
            platform="twitter",
            platform_content_id="mine-1",
            content_text="My content",
            content_url="https://x.com/example/status/mine-1",
        )
        self.theirs = Contribution.objects.create(
            user=self.other_user,
            platform="twitter",
            platform_content_id="theirs-1",
            content_text="Other content",
            content_url="https://x.com/example/status/theirs-1",
        )

    @patch("apps.ai_core.views.score_contribution_task.delay")
    def test_job_queue_success(self, delay_mock):
        delay_mock.return_value.id = "task-123"
        self.client.force_authenticate(user=self.user)

        response = self.client.post(
            reverse("ai_core_score_job"),
            {"contribution_id": str(self.mine.id)},
            format="json",
        )

        self.assertEqual(response.status_code, 202)
        self.assertEqual(response.data["status"], "queued")
        self.assertEqual(response.data["task_id"], "task-123")

    def test_job_requires_auth(self):
        response = self.client.post(
            reverse("ai_core_score_job"),
            {"contribution_id": str(self.mine.id)},
            format="json",
        )
        self.assertEqual(response.status_code, 401)

    def test_job_enforces_ownership(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.post(
            reverse("ai_core_score_job"),
            {"contribution_id": str(self.theirs.id)},
            format="json",
        )
        self.assertEqual(response.status_code, 404)
