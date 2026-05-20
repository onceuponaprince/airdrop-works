import logging

from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import AirdropPayoutApproval, ApprovalAudit

logger = logging.getLogger(__name__)


@receiver(post_save, sender=AirdropPayoutApproval)
def handle_approval_post_save(sender, instance: AirdropPayoutApproval, created: bool, **kwargs):
    """Create an audit record and emit a log message on approval creation/changes.

    This keeps an audit trail in the DB and writes a concise notification to the logs.
    """
    action = "created" if created else ("approved" if instance.approved else "updated")
    try:
        ApprovalAudit.objects.create(
            approval=instance, action=action, actor=getattr(instance, "approved_by", None), notes=instance.notes or ""
        )
    except Exception:
        logger.exception("Failed to create ApprovalAudit for approval id=%s", getattr(instance, "id", None))

    # Simple notification via logging for now. Integrations (email/Slack) can hook into this logger.
    logger.info("Approval %s: id=%s batch=%s approved=%s", action, instance.id, instance.batch_id, instance.approved)
