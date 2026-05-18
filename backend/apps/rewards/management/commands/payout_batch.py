from __future__ import annotations

from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "Run a payout batch (dry-run by default)."

    def add_arguments(self, parser):
        parser.add_argument("--dry-run", action="store_true", dest="dry_run", default=True,
                            help="Perform a dry run without sending transactions.")
        parser.add_argument("--approve", action="store_true", dest="approve", default=False,
                            help="Approve and execute payouts (requires --dry-run to be omitted).")

    def handle(self, *args, **options):
        dry_run = options.get("dry_run", True)
        approve = options.get("approve", False)

        if dry_run and approve:
            self.stdout.write(self.style.ERROR("Cannot --approve during --dry-run. Use --approve without --dry-run."))
            return

        # Skeleton: gather eligible payouts
        self.stdout.write("Gathering eligible payouts...")
        # TODO: load campaign payouts, calculate amounts, prepare transaction payloads

        payouts = [
            {"recipient": "0xabc...", "amount": "10.0", "token": "AIRDROP"},
        ]

        # If a NODE RPC is configured, estimate gas for each payout (dry run)
        rpc_url = getattr(__import__("django.conf").conf.settings, "WEB3_RPC_URL", "")
        if rpc_url:
            from ...rewards.utils import estimate_erc20_transfer_gas

            for p in payouts:
                # For demonstration we assume 18 decimals for token amount; callers
                # should replace with actual token decimals when available.
                try:
                    amount_wei = int(float(p["amount"]) * (10 ** 18))
                except Exception:
                    amount_wei = int(float(p.get("amount", "0")) * (10 ** 18))

                gas = estimate_erc20_transfer_gas(rpc_url, p.get("token_contract", p.get("token", "")), p["recipient"], amount_wei)
                if gas:
                    self.stdout.write(f"Estimated gas for sending {p['amount']} {p['token']} to {p['recipient']}: {gas}")
                else:
                    self.stdout.write(self.style.WARNING(f"Could not estimate gas for {p['recipient']} ({p['token']})"))


        self.stdout.write(f"Prepared {len(payouts)} payouts")

        if dry_run:
            self.stdout.write("Dry run mode — not sending transactions")
            for p in payouts:
                self.stdout.write(f"DRY: would send {p['amount']} {p['token']} to {p['recipient']}")
            self.stdout.write(self.style.SUCCESS("Dry run complete."))
            return

        if not approve:
            self.stdout.write(self.style.WARNING("No --approve flag provided. Aborting to prevent accidental payouts."))
            return

        # Execute payout flow (placeholder)
        for p in payouts:
            # TODO: integrate with web3 library; estimate gas using helper
            self.stdout.write(f"Sending {p['amount']} {p['token']} to {p['recipient']}... (not implemented)")

        self.stdout.write(self.style.SUCCESS("Payout batch executed (placeholder)."))
