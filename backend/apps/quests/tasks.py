"""Celery tasks for quest completion detection and reward distribution."""
from __future__ import annotations

import logging
from typing import TYPE_CHECKING

from celery import shared_task
from django.db import transaction
from django.db.models import Avg, Count, Q
from django.utils import timezone

if TYPE_CHECKING:
    from apps.accounts.models import User
    from apps.contributions.models import Contribution
    from apps.profiles.models import Profile
    from apps.quests.models import Quest, QuestAcceptance
    from apps.rewards.models import LootChest

logger = logging.getLogger(__name__)

# Quest completion criteria thresholds
QUEST_COMPLETION_CRITERIA = {
    "D": {"min_contributions": 1, "min_avg_score": 40},
    "C": {"min_contributions": 3, "min_avg_score": 50},
    "B": {"min_contributions": 5, "min_avg_score": 60},
    "A": {"min_contributions": 8, "min_avg_score": 70},
    "S": {"min_contributions": 12, "min_avg_score": 80},
}

# Rarity mapping based on quest difficulty and average score
def _determine_chest_rarity(difficulty: str, avg_score: float) -> str:
    """Determine loot chest rarity based on quest difficulty and performance."""
    score_tiers = {
        90: "legendary",
        80: "epic",
        70: "rare",
        60: "uncommon",
    }

    # Base rarity from difficulty
    difficulty_base = {
        "S": "epic",
        "A": "rare",
        "B": "uncommon",
        "C": "common",
        "D": "common",
    }.get(difficulty, "common")

    # Upgrade based on score performance
    for threshold, rarity in score_tiers.items():
        if avg_score >= threshold:
            return rarity

    return difficulty_base


@shared_task(bind=True, max_retries=3, default_retry_delay=60, name="quests.check_quest_completion")
def check_quest_completion(self, user_id: str) -> dict:
    """
    Check quest completion criteria for a user's active quest acceptances.

    Evaluates each active quest acceptance against:
    - Minimum number of contributions
    - Minimum average score threshold

    On completion: marks acceptance as completed, creates LootChest, sends notification.
    """
    from apps.accounts.models import User
    from apps.contributions.models import Contribution
    from apps.quests.models import QuestAcceptance
    from apps.rewards.tasks import create_quest_completion_chest

    user = User.objects.filter(id=user_id).first()
    if not user:
        logger.warning("[Quests/Task] User %s not found", user_id)
        return {"status": "missing_user", "user_id": user_id}

    # Get active quest acceptances
    active_acceptances = QuestAcceptance.objects.filter(
        user=user,
        status="active",
        quest__end_date__gt=timezone.now(),
    ).select_related("quest")

    completed_quests = []

    for acceptance in active_acceptances:
        quest = acceptance.quest
        difficulty = quest.difficulty
        criteria = QUEST_COMPLETION_CRITERIA.get(difficulty, QUEST_COMPLETION_CRITERIA["D"])

        # Calculate quest participation metrics
        quest_contributions = Contribution.objects.filter(
            user=user,
            created_at__gte=acceptance.created_at,
            created_at__lte=quest.end_date,
            scored_at__isnull=False,  # Only count scored contributions
            farming_flag__in=["genuine", "ambiguous"],  # Exclude farming
        )

        contribution_count = quest_contributions.count()

        if contribution_count < criteria["min_contributions"]:
            logger.debug(
                "[Quests/Task] Quest %s for user %s: %d/%d contributions",
                quest.id, user_id, contribution_count, criteria["min_contributions"]
            )
            continue

        # Check average score
        agg = quest_contributions.aggregate(avg_score=Avg("total_score"))
        avg_score = agg.get("avg_score") or 0

        if avg_score < criteria["min_avg_score"]:
            logger.debug(
                "[Quests/Task] Quest %s for user %s: avg_score %.1f < %.1f",
                quest.id, user_id, avg_score, criteria["min_avg_score"]
            )
            continue

        # Quest completed!
        with transaction.atomic():
            acceptance.status = "completed"
            acceptance.save(update_fields=["status", "updated_at"])

            # Determine chest rarity
            rarity = _determine_chest_rarity(difficulty, avg_score)

            # Create loot chest async
            chest_task = create_quest_completion_chest.delay(
                user_id=user_id,
                quest_id=str(quest.id),
                rarity=rarity,
                avg_score=int(avg_score),
                contribution_count=contribution_count,
            )

            # Send notification (placeholder - would integrate with notification system)
            _send_quest_completion_notification(
                user_id=user_id,
                quest_title=quest.title,
                rarity=rarity,
                chest_task_id=chest_task.id,
            )

        completed_quests.append({
            "quest_id": str(quest.id),
            "quest_title": quest.title,
            "rarity": rarity,
            "avg_score": avg_score,
            "contribution_count": contribution_count,
        })

        logger.info(
            "[Quests/Task] User %s completed quest %s (%s) with %d contributions, avg_score %.1f, chest rarity %s",
            user_id, quest.id, quest.title, contribution_count, avg_score, rarity
        )

    return {
        "status": "ok",
        "user_id": user_id,
        "completed_count": len(completed_quests),
        "completed_quests": completed_quests,
    }


def _send_quest_completion_notification(
    user_id: str,
    quest_title: str,
    rarity: str,
    chest_task_id: str,
) -> None:
    """
    Send notification for quest completion.

    Placeholder for notification integration (WebSocket, email, etc.)
    """
    logger.info(
        "[Quests/Notification] User %s completed '%s', chest rarity: %s (task: %s)",
        user_id, quest_title, rarity, chest_task_id
    )


@shared_task(name="quests.check_all_active_quests")
def check_all_active_quests() -> dict:
    """
    Periodic task to check quest completion for all users with active quests.

    Runs periodically via Celery beat to catch edge cases.
    """
    from apps.quests.models import QuestAcceptance

    # Get distinct users with active acceptances
    user_ids = QuestAcceptance.objects.filter(
        status="active",
        quest__end_date__gt=timezone.now(),
    ).values_list("user_id", flat=True).distinct()

    queued = 0
    for user_id in user_ids:
        check_quest_completion.delay(str(user_id))
        queued += 1

    logger.info("[Quests/Task] Queued quest completion checks for %d users", queued)

    return {"status": "ok", "queued_users": queued}
