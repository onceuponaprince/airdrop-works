"""Score appeal submission and staff resolution (Phase 5 Wave 2)."""

from __future__ import annotations

from typing import Any

from django.utils import timezone

from apps.contributions.models import Contribution

from .models import ScoreAppeal


class AppealValidationError(Exception):
    def __init__(self, message: str, code: str = "invalid"):
        self.message = message
        self.code = code
        super().__init__(message)


def serialize_appeal(appeal: ScoreAppeal) -> dict[str, Any]:
    contribution_id = str(appeal.contribution_id) if appeal.contribution_id else None
    return {
        "id": str(appeal.id),
        "subject": appeal.subject,
        "status": appeal.status,
        "reason": appeal.reason,
        "contributionId": contribution_id,
        "snapshotFarmingFlag": appeal.snapshot_farming_flag,
        "snapshotCompositeScore": appeal.snapshot_composite_score,
        "resolutionNote": appeal.resolution_note,
        "resolvedAt": appeal.resolved_at.isoformat() if appeal.resolved_at else None,
        "createdAt": appeal.created_at.isoformat(),
        "walletAddress": appeal.user.wallet_address,
    }


def create_contribution_appeal(*, user, contribution_id: str, reason: str) -> ScoreAppeal:
    reason = (reason or "").strip()
    if len(reason) < 20:
        raise AppealValidationError("Reason must be at least 20 characters.", "reason_too_short")

    try:
        contribution = Contribution.objects.get(id=contribution_id, user=user)
    except Contribution.DoesNotExist as exc:
        raise AppealValidationError("Contribution not found.", "not_found") from exc

    if not contribution.scored_at:
        raise AppealValidationError("Contribution is not scored yet.", "not_scored")

    if ScoreAppeal.objects.filter(
        user=user,
        contribution=contribution,
        status="pending",
    ).exists():
        raise AppealValidationError("A pending appeal already exists for this contribution.", "duplicate")

    return ScoreAppeal.objects.create(
        user=user,
        contribution=contribution,
        subject="contribution",
        reason=reason,
        status="pending",
        snapshot_farming_flag=contribution.farming_flag or "",
        snapshot_composite_score=contribution.total_score,
    )


def resolve_appeal(
    appeal: ScoreAppeal,
    *,
    staff_user,
    status: str,
    resolution_note: str = "",
) -> ScoreAppeal:
    if status not in ("upheld", "rejected"):
        raise AppealValidationError("status must be upheld or rejected.", "invalid_status")
    if appeal.status != "pending":
        raise AppealValidationError("Appeal is already resolved.", "already_resolved")

    appeal.status = status
    appeal.resolution_note = (resolution_note or "").strip()
    appeal.resolved_by = staff_user
    appeal.resolved_at = timezone.now()
    appeal.save(
        update_fields=[
            "status",
            "resolution_note",
            "resolved_by",
            "resolved_at",
            "updated_at",
        ]
    )

    if status == "upheld" and appeal.contribution_id:
        contribution = appeal.contribution
        if contribution and contribution.farming_flag == "farming":
            contribution.farming_flag = "genuine"
            contribution.save(update_fields=["farming_flag", "updated_at"])

    return appeal
