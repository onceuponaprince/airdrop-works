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
        self.profile, _ = Profile.objects.get_or_create(user=self.user)
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
        # XP: base=70*5=350, genuine*2.0=700; +50 builder bonus (impact>70) → xp_awarded=750; total_xp=700 (base only)
        self.assertEqual(self.contribution.xp_awarded, 750)
        self.assertEqual(self.profile.total_xp, 700)
        self.assertEqual(self.profile.builder_xp, 50)
        self.assertEqual(self.profile.educator_xp, 700)  # twitter platform branch

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


class XPMathTests(TestCase):
    """Pure math tests for XP calculation per spec: base=score*5 (0-500), multipliers, dim bonuses."""

    def test_calculate_xp_genuine(self):
        from apps.ai_core.workflow import _calculate_xp
        xp, breakdown = _calculate_xp(80, "genuine")
        self.assertEqual(xp, 800)  # 80*5*2
        self.assertEqual(breakdown["farming_multiplier"], 2.0)

    def test_calculate_xp_ambiguous(self):
        from apps.ai_core.workflow import _calculate_xp
        xp, _ = _calculate_xp(60, "ambiguous")
        self.assertEqual(xp, 375)  # 60*5*1.25

    def test_calculate_xp_farming(self):
        from apps.ai_core.workflow import _calculate_xp
        xp, _ = _calculate_xp(90, "farming")
        self.assertEqual(xp, 0)

    def test_dimension_bonuses_high_scores(self):
        from apps.ai_core.workflow import _calculate_dimension_bonuses
        result = {"teaching_value": 85, "originality": 75, "community_impact": 65}
        bonuses = _calculate_dimension_bonuses(result)
        self.assertEqual(bonuses.get("educator_xp"), 50)
        self.assertEqual(bonuses.get("creator_xp"), 50)
        self.assertNotIn("builder_xp", bonuses)
