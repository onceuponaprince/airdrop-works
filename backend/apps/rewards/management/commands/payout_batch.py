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
