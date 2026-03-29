from __future__ import annotations

import json

from django.core.management.base import BaseCommand, CommandError

from apps.spore.services.seeding import seed_spore_scenario


class Command(BaseCommand):
    help = "Seed SPORE with generated scenario data for demos/testing."

    def add_arguments(self, parser):
        parser.add_argument("--tenant-slug", required=True)
        parser.add_argument("--tenant-name", default="Demo Tenant")
        parser.add_argument("--scenario", default="twitter_pair", help="twitter_pair | campaign_launch")
        parser.add_argument("--days", type=int, default=30)
        parser.add_argument("--content-per-account", type=int, default=20)
        parser.add_argument("--ambient-accounts", type=int, default=8)
        parser.add_argument("--owner-wallet", default="")
        parser.add_argument("--random-seed", type=int, default=42)

    def handle(self, *args, **options):
        try:
            result = seed_spore_scenario(
                options["tenant_slug"],
                tenant_name=options["tenant_name"],
                scenario=options["scenario"],
                days=options["days"],
                content_per_account=options["content_per_account"],
                ambient_accounts=options["ambient_accounts"],
                owner_wallet=options["owner_wallet"] or None,
                random_seed=options["random_seed"],
            )
        except ValueError as exc:
            raise CommandError(str(exc)) from exc

        self.stdout.write(self.style.SUCCESS("SPORE scenario seeded"))
        self.stdout.write(json.dumps(result.to_dict(), indent=2))
