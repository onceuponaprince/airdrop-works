from __future__ import annotations

import json

from django.core.management.base import BaseCommand, CommandError
from django.db import OperationalError

from apps.spore.services.provisioning import provision_tenant


class Command(BaseCommand):
    help = "Provision a SPORE tenant with owner membership and optional API key."

    def add_arguments(self, parser):
        parser.add_argument("--tenant-slug", required=True)
        parser.add_argument("--tenant-name", required=True)
        parser.add_argument("--plan", default="starter")
        parser.add_argument("--owner-wallet", required=True)
        parser.add_argument("--owner-username", default="")
        parser.add_argument("--owner-email", default="")
        parser.add_argument("--key-name", default="launch-key")
        parser.add_argument("--skip-api-key", action="store_true")
        parser.add_argument("--quota-daily-query", type=int, default=1000)
        parser.add_argument("--quota-daily-ingest", type=int, default=500)
        parser.add_argument("--quota-daily-relationship", type=int, default=1000)
        parser.add_argument("--quota-daily-brief-generate", type=int, default=200)

    def handle(self, *args, **options):
        try:
            result = provision_tenant(
                tenant_slug=options["tenant_slug"],
                tenant_name=options["tenant_name"],
                plan=options["plan"],
                owner_wallet=options["owner_wallet"],
                owner_username=options["owner_username"],
                owner_email=options["owner_email"] or None,
                key_name=options["key_name"],
                skip_api_key=options["skip_api_key"],
                quota_daily_query=options["quota_daily_query"],
                quota_daily_ingest=options["quota_daily_ingest"],
                quota_daily_relationship=options["quota_daily_relationship"],
                quota_daily_brief_generate=options["quota_daily_brief_generate"],
            )
        except OperationalError as exc:
            raise CommandError(
                "User table is unavailable. Run database setup/migrations before provisioning tenants."
            ) from exc

        self.stdout.write(self.style.SUCCESS("SPORE tenant provisioned"))
        self.stdout.write(json.dumps(result.to_dict(), indent=2))
