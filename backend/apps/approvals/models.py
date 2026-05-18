from django.conf import settings
from django.db import models


class AirdropPayoutApproval(models.Model):
    batch_id = models.CharField(max_length=128, null=True, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="approvals_created"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    approved = models.BooleanField(default=False)
    approved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="approvals_approved"
    )
    approved_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        db_table = "rewards_airdrop_payout_approval"

    def __str__(self) -> str:  # pragma: no cover - trivial
        return f"Approval(id={self.id}, batch_id={self.batch_id}, approved={self.approved})"


class ApprovalAudit(models.Model):
    ACTION_CHOICES = [
        ("created", "created"),
        ("approved", "approved"),
        ("updated", "updated"),
    ]

    approval = models.ForeignKey(AirdropPayoutApproval, on_delete=models.CASCADE, related_name="audits")
    action = models.CharField(max_length=32, choices=ACTION_CHOICES)
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)
    timestamp = models.DateTimeField(auto_now_add=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["-timestamp"]

    def __str__(self) -> str:  # pragma: no cover - trivial
        return f"Audit(approval_id={self.approval_id}, action={self.action}, at={self.timestamp})"
