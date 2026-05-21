"""Celery tasks for guarded onchain payout execution (no broadcast in dry-run mode)."""

from __future__ import annotations

import logging

from celery import shared_task
from django.conf import settings
from django.utils import timezone

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
