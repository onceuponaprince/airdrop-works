from django.db import models


class AirdropPayoutApproval(models.Model):
    batch_id = models.CharField(max_length=128, null=True, blank=True)
    # store actor ids as integers to avoid cross-app migration ordering issues
    created_by = models.IntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    approved = models.BooleanField(default=False)
    approved_by = models.IntegerField(null=True, blank=True)
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
    actor = models.IntegerField(null=True, blank=True)
    timestamp = models.DateTimeField(auto_now_add=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ["-timestamp"]

    def __str__(self) -> str:  # pragma: no cover - trivial
        return f"Audit(approval_id={self.approval_id}, action={self.action}, at={self.timestamp})"
