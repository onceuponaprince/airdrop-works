"""Seed a local QA superadmin for frontend dev login and Django admin."""

from __future__ import annotations

import os

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from apps.accounts.models import User
from apps.payments.models import UserSubscription

DEFAULT_WALLET = "0x0000000000000000000000000000000000000000"
DEFAULT_USERNAME = "qa-superadmin"
DEFAULT_EMAIL = "qa-superadmin@airdrop.works"


class Command(BaseCommand):
    help = "Create or update the local QA superadmin user."

    def add_arguments(self, parser):
        parser.add_argument(
            "--wallet",
            default=os.getenv("QA_SUPERADMIN_WALLET", DEFAULT_WALLET),
            help="Wallet address used for frontend dev login.",
        )
        parser.add_argument(
            "--username",
            default=os.getenv("QA_SUPERADMIN_USERNAME", DEFAULT_USERNAME),
            help="Django username for the QA superadmin.",
        )
        parser.add_argument(
            "--email",
            default=os.getenv("QA_SUPERADMIN_EMAIL", DEFAULT_EMAIL),
            help="Email address for the QA superadmin.",
        )
        parser.add_argument(
            "--password",
            default=os.getenv("QA_SUPERADMIN_PASSWORD", ""),
            help="Django admin password. Can also be set with QA_SUPERADMIN_PASSWORD.",
        )
        parser.add_argument(
            "--credits",
            type=int,
            default=int(os.getenv("QA_SUPERADMIN_CREDITS", "500")),
            help="Credits to assign for paid-path QA.",
        )
        parser.add_argument(
            "--plan",
            choices=("free", "pro", "team"),
            default=os.getenv("QA_SUPERADMIN_PLAN", "team"),
            help="User subscription plan to assign.",
        )

    def handle(self, *args, **options):
        wallet = str(options["wallet"]).strip().lower()
        password = str(options["password"])
        username = str(options["username"]).strip()
        email = str(options["email"]).strip()

        if not wallet.startswith("0x") or len(wallet) != 42:
            raise CommandError("--wallet must be a 42-character EVM address")
        if not password:
            raise CommandError("Provide --password or QA_SUPERADMIN_PASSWORD")

        with transaction.atomic():
            user, created = User.objects.update_or_create(
                wallet_address=wallet,
                defaults={
                    "username": username,
                    "email": email,
                    "display_name": "QA Superadmin",
                    "is_staff": True,
                    "is_superuser": True,
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
            subscription.plan = options["plan"]
            subscription.credits_remaining = options["credits"]
            subscription.save(update_fields=["plan", "credits_remaining", "updated_at"])

        action = "created" if created else "updated"
        self.stdout.write(self.style.SUCCESS(f"QA superadmin {action}: {username}"))
        self.stdout.write(f"wallet={wallet}")
        self.stdout.write(f"email={email}")
        self.stdout.write(f"is_staff={user.is_staff} is_superuser={user.is_superuser}")
        self.stdout.write(f"plan={subscription.plan} credits={subscription.credits_remaining}")
