"""Seed deterministic local QA accounts with fake wallet addresses."""

from __future__ import annotations

import os

from django.core.management.base import BaseCommand
from django.db import transaction

from apps.accounts.models import User
from apps.payments.models import UserSubscription

DEFAULT_PASSWORD = "AirdropQA!2026"
QA_ACCOUNTS = [
    {
        "username": "qa-superadmin",
        "email": "qa-superadmin@airdrop.works",
        "wallet": "0x0000000000000000000000000000000000000000",
        "display_name": "QA Superadmin",
        "is_staff": True,
        "is_superuser": True,
        "plan": "team",
        "credits": 500,
    },
    {
        "username": "qa-admin-one",
        "email": "qa-admin-one@airdrop.works",
        "wallet": "0x0000000000000000000000000000000000000001",
        "display_name": "QA Admin One",
        "is_staff": True,
        "is_superuser": True,
        "plan": "team",
        "credits": 500,
    },
    {
        "username": "qa-admin-two",
        "email": "qa-admin-two@airdrop.works",
        "wallet": "0x0000000000000000000000000000000000000002",
        "display_name": "QA Admin Two",
        "is_staff": True,
        "is_superuser": True,
        "plan": "pro",
        "credits": 250,
    },
    {
        "username": "qa-non-admin",
        "email": "qa-non-admin@airdrop.works",
        "wallet": "0x0000000000000000000000000000000000000010",
        "display_name": "QA Non Admin",
        "is_staff": False,
        "is_superuser": False,
        "plan": "free",
        "credits": 25,
    },
]


class Command(BaseCommand):
    help = "Create deterministic fake-wallet QA users for local endpoint testing."

    def add_arguments(self, parser):
        parser.add_argument(
            "--password",
            default=os.getenv("QA_ACCOUNT_PASSWORD", DEFAULT_PASSWORD),
            help="Password assigned to every seeded QA account for Django admin login.",
        )

    def handle(self, *args, **options):
        password = str(options["password"])
        if not password:
            self.stderr.write("Password cannot be blank")
            raise SystemExit(1)

        rows = []
        with transaction.atomic():
            for account in QA_ACCOUNTS:
                user, created = User.objects.update_or_create(
                    wallet_address=account["wallet"].lower(),
                    defaults={
                        "username": account["username"],
                        "email": account["email"],
                        "display_name": account["display_name"],
                        "is_staff": account["is_staff"],
                        "is_superuser": account["is_superuser"],
                        "is_active": True,
                    },
                )
                user.set_password(password)
                user.save(
                    update_fields=[
                        "password",
                        "username",
                        "email",
                        "display_name",
                        "is_staff",
                        "is_superuser",
                        "is_active",
                        "updated_at",
                    ]
                )

                subscription, _ = UserSubscription.objects.get_or_create(user=user)
                subscription.plan = account["plan"]
                subscription.credits_remaining = account["credits"]
                subscription.save(update_fields=["plan", "credits_remaining", "updated_at"])

                rows.append(("created" if created else "updated", user, subscription))

        for action, user, subscription in rows:
            role = "superadmin" if user.is_superuser else "non-admin"
            self.stdout.write(
                self.style.SUCCESS(
                    f"{action}: {user.username} ({role}) wallet={user.wallet_address} "
                    f"plan={subscription.plan} credits={subscription.credits_remaining}"
                )
            )

        self.stdout.write("Use message=dev-bypass and signature=dev-bypass in local/dev mode.")
