from django.db import models
from django.conf import settings


class PayoutApprovalRecord(models.Model):
    batch_id = models.CharField(max_length=128, blank=True, null=True, help_text="Optional batch identifier for approval")
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name='+')
    created_at = models.DateTimeField(auto_now_add=True)

    approved = models.BooleanField(default=False)
    approved_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name='+')
    approved_at = models.DateTimeField(null=True, blank=True)

    notes = models.TextField(blank=True)

    class Meta:
        verbose_name = "Payout Approval"
        verbose_name_plural = "Payout Approvals"
        app_label = "apps.rewards"

    def __str__(self) -> str:  # pragma: no cover - trivial
        return f"PayoutApprovalRecord(batch={self.batch_id} approved={self.approved})"
