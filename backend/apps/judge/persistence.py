"""Persist authenticated platform judge scores as user contributions."""

from __future__ import annotations

import logging

from django.db.models import F
from django.utils import timezone

logger = logging.getLogger(__name__)


def persist_scored_contribution(user, text: str, result: dict) -> str | None:
    """Upsert a Contribution row for a platform judge paste and award XP.

    Uses platform ``twitter`` with a per-user content-hash id so repeat scores
    update the same row instead of violating unique_together.
    """
    from apps.contributions.models import PLATFORM_BRANCH_MAP, Contribution
    from apps.judge.service import hash_content
    from apps.profiles.models import Profile

    content_hash = hash_content(text)
    platform_content_id = f"judge:{user.pk}:{content_hash}"
    composite = int(result.get("composite_score") or 0)
    farming_flag = result.get("farming_flag") or "ambiguous"
    xp_awarded = composite if farming_flag != "farming" else 0
    now = timezone.now()

    contribution, created = Contribution.objects.update_or_create(
        platform="twitter",
        platform_content_id=platform_content_id,
        defaults={
            "user": user,
            "content_text": text[:10000],
            "teaching_value": result.get("teaching_value"),
            "originality": result.get("originality"),
            "community_impact": result.get("community_impact"),
            "total_score": composite,
            "farming_flag": farming_flag,
            "farming_explanation": result.get("farming_explanation") or "",
            "dimension_explanations": result.get("dimension_explanations") or {},
            "xp_awarded": xp_awarded,
            "scored_at": now,
        },
    )

    if xp_awarded > 0:
        branch = PLATFORM_BRANCH_MAP.get(contribution.platform, "educator")
        xp_field = f"{branch}_xp"
        Profile.objects.filter(user=user).update(
            total_xp=F("total_xp") + xp_awarded,
            **{xp_field: F(xp_field) + xp_awarded},
        )

    logger.info(
        "[JudgeScore] %s contribution %s for user %s (xp=%d)",
        "Created" if created else "Updated",
        contribution.id,
        user.pk,
        xp_awarded,
    )
    return str(contribution.id)
