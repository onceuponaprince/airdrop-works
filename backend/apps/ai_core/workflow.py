"""Async workflow orchestration for AI core scoring."""

from __future__ import annotations

import logging

from django.db.models import F
from django.utils import timezone

logger = logging.getLogger(__name__)


def run_scoring_pipeline(contribution_id: str) -> dict[str, int | str]:
    """Score one contribution and apply resulting profile XP projection."""
    from apps.contributions.models import Contribution
    from apps.rewards.tasks import create_loot_chest_for_milestone
    from apps.profiles.tasks import notify_skill_tree_suggestions
    from apps.quests.tasks import check_quest_completion

    contribution = Contribution.objects.filter(id=contribution_id).first()
    if not contribution:
        logger.error("[AICore/Workflow] Contribution %s not found", contribution_id)
        return {"status": "missing", "contribution_id": contribution_id}

    if contribution.scored_at:
        logger.debug("[AICore/Workflow] Contribution %s already scored", contribution_id)
        return {"status": "already_scored", "contribution_id": contribution_id}

    rubric = _resolve_rubric(contribution)
    result = _score_contribution_v2(contribution=contribution, rubric=rubric)

    # Calculate XP with farming bonuses
    xp, xp_breakdown = _calculate_xp(
        result["composite_score"],
        result["farming_flag"]
    )
    xp_awarded = xp if result["farming_flag"] != "farming" else 0

    # Calculate dimension bonuses (only for non-farming content)
    dimension_bonuses = _calculate_dimension_bonuses(result) if result["farming_flag"] != "farming" else {}

    # Update contribution record
    Contribution.objects.filter(id=contribution_id).update(
        teaching_value=result["teaching_value"],
        originality=result["originality"],
        community_impact=result["community_impact"],
        total_score=result["composite_score"],
        farming_flag=result["farming_flag"],
        farming_explanation=result["farming_explanation"],
        dimension_explanations=result["dimension_explanations"],
        xp_awarded=xp_awarded + sum(dimension_bonuses.values()),
        scored_at=timezone.now(),
    )

    # Award XP with bonuses
    xp_result = None
    if xp_awarded > 0:
        xp_result = _award_xp(
            contribution=contribution,
            xp=xp_awarded,
            dimension_bonuses=dimension_bonuses
        )

        # Check for milestone chests
        for milestone in xp_result.get("crossed_milestones", []):
            create_loot_chest_for_milestone.delay(
                user_id=str(contribution.user_id),
                milestone_xp=milestone
            )

        # Check for skill tree unlock suggestions
        notify_skill_tree_suggestions.delay(str(contribution.user_id))

    # Check quest completion (async task)
    check_quest_completion.delay(str(contribution.user_id))

    # Create in-app notification for score result (realtime via channels)
    from apps.notifications.service import NotificationService as AICoreNotificationService
    try:
        AICoreNotificationService.notify_score_complete(
            contribution.user,
            contribution_id=str(contribution.id),
            score=result["composite_score"],
        )
    except Exception:
        logger.exception("Failed to create score notification")

    logger.info(
        "[AICore/Workflow] Scored %s: composite=%d flag=%s xp=%d bonuses=%s",
        contribution_id,
        result["composite_score"],
        result["farming_flag"],
        xp_awarded,
        dimension_bonuses,
    )

    return {
        "status": "ok",
        "contribution_id": contribution_id,
        "score": result["composite_score"],
        "farming_flag": result["farming_flag"],
        "xp_awarded": xp_awarded,
        "xp_breakdown": xp_breakdown,
        "dimension_bonuses": dimension_bonuses,
        "xp_result": xp_result,
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


def _calculate_xp(composite_score: int, farming_flag: str) -> tuple[int, dict[str, int]]:
    """
    Calculate XP from contribution score with farming penalties/bonuses.

    Returns:
        Tuple of (total_xp, xp_breakdown dict)
    """
    # Base XP: score 0-100 → XP 0-500
    base_xp = composite_score * 5

    # Farming flag bonuses
    farming_multiplier = {
        "genuine": 2.0,  # +100% bonus
        "ambiguous": 1.25,  # +25% bonus
        "farming": 0.0,  # 0 XP
    }.get(farming_flag, 1.0)

    total_xp = int(base_xp * farming_multiplier)

    breakdown = {
        "base_xp": base_xp,
        "farming_multiplier": farming_multiplier,
        "farming_bonus": int(base_xp * (farming_multiplier - 1)) if farming_multiplier > 1 else 0,
        "total_xp": total_xp,
    }

    return total_xp, breakdown


def _calculate_dimension_bonuses(result: dict) -> dict[str, int]:
    """
    Calculate branch-specific XP bonuses based on dimension scores.

    - teaching_value>70 → +50 educator_xp
    - originality>70 → +50 creator_xp
    - community_impact>70 → +50 builder_xp
    """
    bonuses = {
        "educator_xp": 50 if result.get("teaching_value", 0) > 70 else 0,
        "creator_xp": 50 if result.get("originality", 0) > 70 else 0,
        "builder_xp": 50 if result.get("community_impact", 0) > 70 else 0,
    }
    return {k: v for k, v in bonuses.items() if v > 0}


def _award_xp(contribution, xp: int, dimension_bonuses: dict[str, int] | None = None) -> dict:
    """
    Award XP to user's profile with branch-specific bonuses.

    Returns dict with XP breakdown for notifications/logging.
    """
    from apps.contributions.models import PLATFORM_BRANCH_MAP
    from apps.profiles.models import Profile

    branch = PLATFORM_BRANCH_MAP.get(contribution.platform, "educator")
    xp_field = f"{branch}_xp"

    # Build update fields
    update_fields = {
        "total_xp": F("total_xp") + xp,
        xp_field: F(xp_field) + xp,
    }

    # Add dimension bonuses
    bonus_breakdown = {}
    if dimension_bonuses:
        for field, bonus in dimension_bonuses.items():
            if bonus > 0:
                update_fields[field] = F(field) + bonus
                bonus_breakdown[field] = bonus

    # Apply updates
    Profile.objects.filter(user=contribution.user).update(**update_fields)

    # Get updated profile for potential notifications
    profile = Profile.objects.filter(user=contribution.user).first()
    old_total = (profile.total_xp if profile else 0) - xp

    # Check for milestone crossings
    milestones = [1000, 2500, 5000, 10000, 25000, 50000]
    crossed_milestones = [m for m in milestones if old_total < m <= (profile.total_xp if profile else 0)]

    return {
        "base_xp_awarded": xp,
        "platform_branch": branch,
        "dimension_bonuses": bonus_breakdown,
        "total_xp_earned": xp + sum(bonus_breakdown.values()),
        "crossed_milestones": crossed_milestones,
        "new_total_xp": profile.total_xp if profile else 0,
    }
