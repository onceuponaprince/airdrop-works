"""Celery tasks for profile-related automation: skill tree suggestions, rank updates."""

from __future__ import annotations

import logging

from celery import shared_task

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=2, default_retry_delay=30, name="profiles.notify_skill_tree_suggestions")
def notify_skill_tree_suggestions(self, user_id: str) -> dict:
    """
    Notify user of potential skill tree node unlocks based on current XP.

    Does NOT auto-unlock; only suggests based on thresholds crossed.
    Thresholds: 100, 250, 500, 1000 XP per branch.
    """
    from apps.profiles.models import Profile

    profile = Profile.objects.filter(user_id=user_id).first()
    if not profile:
        return {"status": "missing_profile", "user_id": user_id}

    thresholds = [100, 250, 500, 1000, 2500]
    suggestions = []

    branches = {
        "educator": profile.educator_xp,
        "builder": profile.builder_xp,
        "creator": profile.creator_xp,
        "scout": profile.scout_xp,
        "diplomat": profile.diplomat_xp,
    }

    for branch, xp in branches.items():
        for t in thresholds:
            if xp >= t:
                node_id = f"{branch}_node_{t}"
                if node_id not in (profile.skill_tree_state or {}):
                    suggestions.append({"branch": branch, "xp": xp, "suggested_node": node_id, "threshold": t})

    if suggestions:
        logger.info(
            "[Profiles/Task] Skill tree suggestions for user %s: %d nodes",
            user_id, len(suggestions)
        )

    return {
        "status": "ok",
        "user_id": user_id,
        "suggestions": suggestions,
        "total_xp": profile.total_xp,
    }
