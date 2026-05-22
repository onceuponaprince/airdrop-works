"""Celery tasks for guarded onchain payout execution (no broadcast in dry-run mode) and loot chest management."""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING

from celery import shared_task
from django.conf import settings
from django.utils import timezone

if TYPE_CHECKING:
    from apps.accounts.models import User
    from apps.rewards.models import LootChest

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=0, name="rewards.execute_payout_approval")
def execute_payout_approval_task(self, approval_id: int) -> dict[str, str]:
    """No-op executor boundary: log intent; real signing only when signer mode allows."""
    from apps.approvals.models import AirdropPayoutApproval

    approval = AirdropPayoutApproval.objects.filter(id=approval_id).first()
    if not approval:
        logger.warning("[OnchainExecutor] Approval %s not found", approval_id)
        return {"status": "missing", "approvalId": str(approval_id)}

    if not approval.approved:
        logger.info("[OnchainExecutor] Approval %s not approved; skipping", approval_id)
        return {"status": "not_approved", "approvalId": str(approval_id)}

    if approval.executed_at:
        logger.info(
            "[OnchainExecutor] Approval %s already executed at %s tx=%s",
            approval_id,
            approval.executed_at,
            approval.tx_hash or "n/a",
        )
        return {"status": "already_executed", "approvalId": str(approval_id)}

    key = approval.tx_idempotency_key
    signer_mode = getattr(settings, "PAYOUT_SIGNER_MODE", "dry-run")
    logger.info(
        "[OnchainExecutor] approval=%s batch=%s idempotency=%s mode=%s (no broadcast)",
        approval_id,
        approval.batch_id,
        key,
        signer_mode,
    )

    if signer_mode != "dry-run":
        logger.warning(
            "[OnchainExecutor] Signer mode %s configured but broadcast is not enabled in Phase 2",
            signer_mode,
        )

    return {
        "status": "logged",
        "approvalId": str(approval_id),
        "idempotencyKey": key,
        "signerMode": signer_mode,
    }


# ── Loot Chest Creation Tasks ────────────────────────────────────────────────

@shared_task(bind=True, max_retries=3, default_retry_delay=30, name="rewards.create_quest_completion_chest")
def create_quest_completion_chest(
    self,
    user_id: str,
    quest_id: str,
    rarity: str,
    avg_score: int,
    contribution_count: int,
) -> dict[str, str]:
    """
    Create a loot chest for quest completion.

    Rarity is determined by quest difficulty and average score performance.
    """
    from apps.accounts.models import User
    from apps.rewards.models import LootChest

    user = User.objects.filter(id=user_id).first()
    if not user:
        logger.warning("[Rewards/Task] User %s not found for quest completion chest", user_id)
        return {"status": "missing_user", "user_id": user_id}

    chest = LootChest.objects.create(
        user=user,
        rarity=rarity,
        source="quest_completion",
        metadata={
            "quest_id": quest_id,
            "avg_score": avg_score,
            "contribution_count": contribution_count,
            "created_by_task": "rewards.create_quest_completion_chest",
        },
    )

    logger.info(
        "[Rewards/Task] Created %s chest for user %s (quest %s, score %d)",
        rarity, user_id, quest_id, avg_score
    )

    # Send notification about new chest
    _send_chest_notification(
        user_id=user_id,
        rarity=rarity,
        source="quest",
        chest_id=str(chest.id),
    )

    return {
        "status": "created",
        "chest_id": str(chest.id),
        "user_id": user_id,
        "rarity": rarity,
        "quest_id": quest_id,
    }


@shared_task(bind=True, max_retries=3, default_retry_delay=30, name="rewards.create_loot_chest_for_milestone")
def create_loot_chest_for_milestone(
    self,
    user_id: str,
    milestone_xp: int,
) -> dict[str, str]:
    """
    Create a loot chest when user crosses an XP milestone.

    Milestones: 1000, 2500, 5000, 10000, etc.
    Rarity scales with milestone tier.
    """
    from apps.accounts.models import User
    from apps.rewards.models import LootChest

    # Determine rarity based on milestone
    rarity_tiers = [
        (50000, "legendary"),
        (25000, "epic"),
        (10000, "epic"),
        (5000, "rare"),
        (2500, "uncommon"),
        (1000, "uncommon"),
    ]

    rarity = "common"
    for threshold, tier_rarity in rarity_tiers:
        if milestone_xp >= threshold:
            rarity = tier_rarity
            break

    user = User.objects.filter(id=user_id).first()
    if not user:
        logger.warning("[Rewards/Task] User %s not found for milestone chest", user_id)
        return {"status": "missing_user", "user_id": user_id}

    # Check if chest already created for this milestone
    existing = LootChest.objects.filter(
        user=user,
        source="milestone",
        metadata__milestone_xp=milestone_xp,
    ).first()

    if existing:
        logger.debug(
            "[Rewards/Task] Milestone chest already exists for user %s at %d XP",
            user_id, milestone_xp
        )
        return {"status": "already_exists", "chest_id": str(existing.id)}

    chest = LootChest.objects.create(
        user=user,
        rarity=rarity,
        source="milestone",
        metadata={
            "milestone_xp": milestone_xp,
            "created_by_task": "rewards.create_loot_chest_for_milestone",
        },
    )

    logger.info(
        "[Rewards/Task] Created %s milestone chest for user %s (XP %d)",
        rarity, user_id, milestone_xp
    )

    _send_chest_notification(
        user_id=user_id,
        rarity=rarity,
        source="milestone",
        chest_id=str(chest.id),
        milestone=milestone_xp,
    )

    return {
        "status": "created",
        "chest_id": str(chest.id),
        "user_id": user_id,
        "rarity": rarity,
        "milestone_xp": milestone_xp,
    }


@shared_task(bind=True, max_retries=3, default_retry_delay=30, name="rewards.create_rank_promotion_chest")
def create_rank_promotion_chest(
    self,
    user_id: str,
    old_rank: int | None,
    new_rank: int,
) -> dict[str, str]:
    """
    Create a loot chest when user achieves a rank promotion.

    Rank 1-10: Legendary
    Rank 11-50: Epic
    Rank 51-100: Rare
    Rank 101+: Uncommon
    """
    from apps.accounts.models import User
    from apps.rewards.models import LootChest

    # Determine rarity based on new rank
    if new_rank <= 10:
        rarity = "legendary"
    elif new_rank <= 50:
        rarity = "epic"
    elif new_rank <= 100:
        rarity = "rare"
    else:
        rarity = "uncommon"

    user = User.objects.filter(id=user_id).first()
    if not user:
        logger.warning("[Rewards/Task] User %s not found for rank promotion chest", user_id)
        return {"status": "missing_user", "user_id": user_id}

    chest = LootChest.objects.create(
        user=user,
        rarity=rarity,
        source="rank_promotion",
        metadata={
            "old_rank": old_rank,
            "new_rank": new_rank,
            "created_by_task": "rewards.create_rank_promotion_chest",
        },
    )

    logger.info(
        "[Rewards/Task] Created %s rank promotion chest for user %s (rank %d → %d)",
        rarity, user_id, old_rank or 0, new_rank
    )

    _send_chest_notification(
        user_id=user_id,
        rarity=rarity,
        source="rank",
        chest_id=str(chest.id),
        old_rank=old_rank,
        new_rank=new_rank,
    )

    return {
        "status": "created",
        "chest_id": str(chest.id),
        "user_id": user_id,
        "rarity": rarity,
        "old_rank": old_rank,
        "new_rank": new_rank,
    }


def _send_chest_notification(
    user_id: str,
    rarity: str,
    source: str,
    chest_id: str,
    **kwargs,
) -> None:
    """
    Send notification about new loot chest availability.

    Placeholder for notification system integration (WebSocket, push, etc.)
    """
    metadata = {"chest_id": chest_id, **kwargs}
    logger.info(
        "[Rewards/Notification] User %s received %s chest (source: %s, id: %s) metadata=%s",
        user_id, rarity, source, chest_id, metadata
    )
