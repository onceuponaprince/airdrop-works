from django.test import TestCase, override_settings

from apps.rewards.approvals import create_approval
from apps.rewards.idempotency import payout_idempotency_key
from apps.rewards.tasks import execute_payout_approval_task


class OnchainExecutorTests(TestCase):
    def test_create_approval_sets_idempotency_key(self):
        approval_id = create_approval(batch_id="phase2-batch", approved=True)
        from django.apps import apps

        Approval = apps.get_model("approvals", "AirdropPayoutApproval")
        obj = Approval.objects.get(id=approval_id)
        self.assertEqual(obj.tx_idempotency_key, payout_idempotency_key(approval_id))

    @override_settings(PAYOUT_SIGNER_MODE="dry-run")
    def test_executor_logs_without_broadcast(self):
        approval_id = create_approval(batch_id="exec-batch", approved=True)
        result = execute_payout_approval_task.run(approval_id=approval_id)
        self.assertEqual(result["status"], "logged")
        self.assertIn("idempotencyKey", result)

    def test_executor_skips_unapproved(self):
        approval_id = create_approval(batch_id="pending-batch", approved=False)
        result = execute_payout_approval_task.run(approval_id=approval_id)
        self.assertEqual(result["status"], "not_approved")
