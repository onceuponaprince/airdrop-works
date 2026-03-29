from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase

from apps.ai_core.workflow import run_scoring_pipeline
from apps.contributions.models import Contribution
from apps.profiles.models import Profile


class ScoringWorkflowTests(TestCase):
    def setUp(self):
        user_model = get_user_model()
        self.user = user_model.objects.create(
            username="workflow-user",
            wallet_address="0x2222222222222222222222222222222222222222",
            is_active=True,
        )
        self.profile = Profile.objects.create(user=self.user)
        self.contribution = Contribution.objects.create(
            user=self.user,
            platform="twitter",
            platform_content_id="123456",
            content_text="A useful educational thread",
            content_url="https://x.com/example/status/123456",
        )

    @patch("apps.ai_core.workflow._score_contribution_v2")
    def test_pipeline_scores_and_awards_xp(self, score_mock):
        score_mock.return_value = {
            "teaching_value": 70,
            "originality": 65,
            "community_impact": 75,
            "composite_score": 70,
            "farming_flag": "genuine",
            "farming_explanation": "Good contribution.",
            "dimension_explanations": {
                "teaching_value": "Clear teaching.",
                "originality": "Moderately original.",
                "community_impact": "Useful for community.",
            },
        }

        result = run_scoring_pipeline(str(self.contribution.id))

        self.assertEqual(result["status"], "ok")
        self.contribution.refresh_from_db()
        self.profile.refresh_from_db()
        self.assertEqual(self.contribution.total_score, 70)
        self.assertEqual(self.contribution.xp_awarded, 70)
        self.assertEqual(self.profile.total_xp, 70)

    @patch("apps.ai_core.workflow._score_contribution_v2")
    def test_pipeline_blocks_farming_xp(self, score_mock):
        score_mock.return_value = {
            "teaching_value": 20,
            "originality": 25,
            "community_impact": 20,
            "composite_score": 22,
            "farming_flag": "farming",
            "farming_explanation": "Low-value spam.",
            "dimension_explanations": {
                "teaching_value": "Low.",
                "originality": "Low.",
                "community_impact": "Low.",
            },
        }

        result = run_scoring_pipeline(str(self.contribution.id))

        self.assertEqual(result["status"], "ok")
        self.contribution.refresh_from_db()
        self.profile.refresh_from_db()
        self.assertEqual(self.contribution.xp_awarded, 0)
        self.assertEqual(self.profile.total_xp, 0)
