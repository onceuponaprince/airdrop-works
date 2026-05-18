from django.core.management import call_command
from django.test import TestCase, override_settings
from io import StringIO

from ..models import PayoutApprovalRecord as PayoutApproval


class PayoutApprovalCommandTests(TestCase):

    @override_settings(WEB3_RPC_URL="https://example", PAYOUT_TOKEN_ADDRESS="0x000000000000000000000000000000000000dEaD", PAYOUT_CHAIN="testnet")
    def test_requires_db_approval(self):
        out = StringIO()
        # run with --execute and --approve but no PayoutApproval in DB
        call_command("payout_batch", "--execute", "--approve", stdout=out)
        output = out.getvalue()
        self.assertIn("No matching approved PayoutApproval found", output)

    @override_settings(WEB3_RPC_URL="https://example", PAYOUT_TOKEN_ADDRESS="0x000000000000000000000000000000000000dEaD", PAYOUT_CHAIN="testnet")
    def test_executes_when_approved(self):
        out = StringIO()

        # create an approval record
        approval = PayoutApproval.objects.create(batch_id="test-batch", approved=True)

        # monkeypatch signer to avoid real RPC calls by patching the import location
        from unittest.mock import patch

        class DummySigner:
            def send_erc20(self, token_address, to_address, amount_wei):
                return "0xdeadbeef"

        with patch("backend.apps.rewards.management.commands.payout_batch.get_configured_signer_service", return_value=DummySigner()):
            # pass the matching approval batch id
            call_command("payout_batch", "--execute", "--approve", "--approval-batch", "test-batch", stdout=out)

        output = out.getvalue()
        self.assertIn("Sent payout transaction", output)
