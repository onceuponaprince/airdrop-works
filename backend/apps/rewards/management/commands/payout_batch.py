from __future__ import annotations

from decimal import Decimal

from django.conf import settings
from django.core.management.base import BaseCommand

from ...payouts import amount_to_wei, estimate_erc20_transfer_gas, get_token_info
from ...signer import get_configured_signer_service
from django.apps import apps as django_apps


class Command(BaseCommand):
    help = "Run a payout batch (dry-run by default)."

    def add_arguments(self, parser):
        mode = parser.add_mutually_exclusive_group()
        mode.add_argument("--dry-run", action="store_true", dest="dry_run", default=True,
                            help="Perform a dry run without sending transactions.")
        mode.add_argument("--execute", action="store_false", dest="dry_run",
                          help="Execute the payout batch instead of simulating it.")
        parser.add_argument("--approve", action="store_true", dest="approve", default=False,
                            help="Approve and execute payouts (requires --execute to be used).")
        parser.add_argument("--approval-batch", dest="approval_batch", default=None,
                            help="Optional batch identifier to require a matching PayoutApproval.batch_id")
        parser.add_argument("--force", action="store_true", dest="force", default=False,
                            help="Force execution ignoring DB approvals (use with caution).")

    def _load_payouts(self):
        # Skeleton: replace with DB-backed payout selection.
        return [
            {
                "recipient": "0x000000000000000000000000000000000000dEaD",
                "amount": "10.0",
                "token_symbol": "AIRDROP",
                "token_address": getattr(settings, "PAYOUT_TOKEN_ADDRESS", ""),
                "chain": getattr(settings, "PAYOUT_CHAIN", "unknown"),
            },
        ]

    def handle(self, *args, **options):
        dry_run = options.get("dry_run", True)
        approve = options.get("approve", False)

        if dry_run and approve:
            self.stdout.write(self.style.ERROR("Cannot --approve during --dry-run. Use --execute --approve to send."))
            return

        rpc_url = getattr(settings, "WEB3_RPC_URL", "")
        signer = get_configured_signer_service()
        payouts = self._load_payouts()

        self.stdout.write(f"Prepared {len(payouts)} payouts")

        for payout in payouts:
            token_address = payout.get("token_address") or ""
            if rpc_url and token_address:
                info = get_token_info(rpc_url, token_address)
                amount_wei = amount_to_wei(Decimal(payout["amount"]), info.decimals)
                gas_estimate = estimate_erc20_transfer_gas(
                    rpc_url=rpc_url,
                    token_address=token_address,
                    to_address=payout["recipient"],
                    amount_wei=amount_wei,
                )
                self.stdout.write(
                    f"Token {info.symbol} ({info.name}), decimals={info.decimals}, estimated gas={gas_estimate or 'n/a'}"
                )
            else:
                amount_wei = amount_to_wei(Decimal(payout["amount"]), 18)
                gas_estimate = None
                self.stdout.write(self.style.WARNING("RPC URL or token address missing; skipping gas estimate."))

            if dry_run:
                self.stdout.write(
                    f"DRY: would send {payout['amount']} {payout['token_symbol']} to {payout['recipient']}"
                )
                continue

            if not approve:
                self.stdout.write(self.style.WARNING("No --approve flag provided. Aborting to prevent accidental payouts."))
                return

            if not signer or not rpc_url or not token_address:
                self.stdout.write(self.style.ERROR("Configured signer service is unavailable or payout config is incomplete."))
                return

            # Before sending any transactions, require DB approval unless forced
            approval_batch = options.get("approval_batch")
            force = options.get("force", False)
            if not force:
                PayoutApproval = django_apps.get_model("apps.rewards", "AirdropPayoutApproval")
                qs = PayoutApproval.objects.filter(approved=True)
                if approval_batch:
                    qs = qs.filter(batch_id=approval_batch)
                if not qs.exists():
                    self.stdout.write(self.style.ERROR(
                        "No matching approved PayoutApproval found. Create an approval in the admin or pass --force to override."
                    ))
                    return

            tx_hash = signer.send_erc20(token_address, payout["recipient"], amount_wei)
            self.stdout.write(self.style.SUCCESS(f"Sent payout transaction: {tx_hash}"))

        if dry_run:
            self.stdout.write(self.style.SUCCESS("Dry run complete."))
        else:
            self.stdout.write(self.style.SUCCESS("Payout batch executed."))
