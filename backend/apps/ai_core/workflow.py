"""Async workflow orchestration for AI core scoring."""

from __future__ import annotations

import logging

from django.db.models import F
from django.utils import timezone

logger = logging.getLogger(__name__)


def run_scoring_pipeline(contribution_id: str) -> dict[str, int | str]:
    """Score one contribution and apply resulting profile XP projection."""
    from apps.contributions.models import Contribution

    contribution = Contribution.objects.filter(id=contribution_id).first()
    if not contribution:
        logger.error("[AICore/Workflow] Contribution %s not found", contribution_id)
        return {"status": "missing", "contribution_id": contribution_id}

    if contribution.scored_at:
        logger.debug("[AICore/Workflow] Contribution %s already scored", contribution_id)
        return {"status": "already_scored", "contribution_id": contribution_id}

    rubric = _resolve_rubric(contribution)
    result = _score_contribution_v2(contribution=contribution, rubric=rubric)
    xp = _calculate_xp(result["composite_score"])
    xp_awarded = xp if result["farming_flag"] != "farming" else 0

    Contribution.objects.filter(id=contribution_id).update(
        teaching_value=result["teaching_value"],
        originality=result["originality"],
        community_impact=result["community_impact"],
        total_score=result["composite_score"],
        farming_flag=result["farming_flag"],
        farming_explanation=result["farming_explanation"],
        dimension_explanations=result["dimension_explanations"],
        xp_awarded=xp_awarded,
        scored_at=timezone.now(),
    )

    if xp_awarded > 0:
        _award_xp(contribution=contribution, xp=xp_awarded)

    logger.info(
        "[AICore/Workflow] Scored %s: composite=%d flag=%s xp=%d",
        contribution_id,
        result["composite_score"],
        result["farming_flag"],
        xp_awarded,
    )

    return {
        "status": "ok",
        "contribution_id": contribution_id,
        "score": result["composite_score"],
        "farming_flag": result["farming_flag"],
        "xp_awarded": xp_awarded,
    }


def _resolve_rubric(contribution):
    if not hasattr(contribution, "quest") or not contribution.quest:
        return None

    from apps.judge.models import ScoringRubric

    rubric_data = contribution.quest.scoring_rubric
    rubric_id = rubric_data.get("rubric_id") if isinstance(rubric_data, dict) else None
    if not rubric_id:
        return None

    return ScoringRubric.objects.filter(id=rubric_id).first()


def _score_contribution(content_text: str, rubric):
    # Legacy helper kept for tests and backward compatibility with previous call sites.
    from apps.judge.service import score_contribution

    return score_contribution(content_text, rubric=rubric)


def _score_contribution_v2(contribution, rubric):
    from apps.spore.services.scoring import compose_contribution_score

    return compose_contribution_score(contribution=contribution, rubric=rubric)


def _calculate_xp(composite_score: int) -> int:
    return composite_score


def _award_xp(contribution, xp: int) -> None:
    from apps.contributions.models import PLATFORM_BRANCH_MAP
    from apps.profiles.models import Profile

    branch = PLATFORM_BRANCH_MAP.get(contribution.platform, "educator")
    xp_field = f"{branch}_xp"

    Profile.objects.filter(user=contribution.user).update(
        total_xp=F("total_xp") + xp,
        **{xp_field: F(xp_field) + xp},
    )
