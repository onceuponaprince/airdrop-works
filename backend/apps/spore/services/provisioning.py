from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from django.contrib.auth import get_user_model
from django.db import OperationalError, transaction

from apps.spore.models import SporeApiKey, Tenant, TenantMembership
from apps.spore.security.keys import generate_api_key, hash_api_key, key_prefix


@dataclass
class ProvisionTenantResult:
    tenant: Tenant
    owner: Any
    membership: TenantMembership
    owner_created: bool
    membership_created: bool
    api_key_id: str | None = None
    plaintext_key: str | None = None
    api_key_name: str = ""

    def to_dict(self) -> dict[str, object]:
        return {
            "tenant": {
                "id": str(self.tenant.id),
                "slug": self.tenant.slug,
                "name": self.tenant.name,
                "plan": self.tenant.plan,
            },
            "owner": {
                "id": str(self.owner.id),
                "wallet_address": self.owner.wallet_address,
                "username": self.owner.username,
                "created": self.owner_created,
            },
            "membership": {
                "id": str(self.membership.id),
                "role": self.membership.role,
                "created": self.membership_created,
            },
            "api_key": {
                "id": self.api_key_id,
                "name": self.api_key_name,
                "plaintext": self.plaintext_key,
            },
        }


@transaction.atomic
def provision_tenant(
    *,
    tenant_slug: str,
    tenant_name: str,
    owner_wallet: str,
    owner_username: str = "",
    owner_email: str | None = None,
    plan: str = "starter",
    key_name: str = "launch-key",
    skip_api_key: bool = False,
    quota_daily_query: int = 1000,
    quota_daily_ingest: int = 500,
    quota_daily_relationship: int = 1000,
    quota_daily_brief_generate: int = 200,
    owner_user=None,
) -> ProvisionTenantResult:
    user_model = get_user_model()

    normalized_wallet = owner_wallet.strip().lower()
    normalized_username = (owner_username or "").strip()
    normalized_email = (owner_email or "").strip() or None
    if not normalized_username:
        normalized_username = f"tenant-owner-{normalized_wallet[-6:]}"

    try:
        owner = owner_user or user_model.objects.filter(wallet_address=normalized_wallet).first()
    except OperationalError as exc:
        raise OperationalError(
            "User table is unavailable. Run database setup/migrations before provisioning tenants."
        ) from exc

    owner_created = False
    if not owner:
        owner = user_model.objects.create(
            username=normalized_username,
            wallet_address=normalized_wallet,
            email=normalized_email,
            is_active=True,
        )
        owner.set_unusable_password()
        owner.save(update_fields=["password"])
        owner_created = True

    tenant, tenant_created = Tenant.objects.get_or_create(
        slug=tenant_slug.strip(),
        defaults={
            "name": tenant_name.strip(),
            "plan": plan.strip(),
            "quota_daily_query": quota_daily_query,
            "quota_daily_ingest": quota_daily_ingest,
            "quota_daily_relationship": quota_daily_relationship,
            "quota_daily_brief_generate": quota_daily_brief_generate,
            "is_active": True,
        },
    )
    if not tenant_created:
        tenant.name = tenant_name.strip()
        tenant.plan = plan.strip()
        tenant.quota_daily_query = quota_daily_query
        tenant.quota_daily_ingest = quota_daily_ingest
        tenant.quota_daily_relationship = quota_daily_relationship
        tenant.quota_daily_brief_generate = quota_daily_brief_generate
        tenant.is_active = True
        tenant.save(
            update_fields=[
                "name",
                "plan",
                "quota_daily_query",
                "quota_daily_ingest",
                "quota_daily_relationship",
                "quota_daily_brief_generate",
                "is_active",
                "updated_at",
            ]
        )

    membership, membership_created = TenantMembership.objects.get_or_create(
        tenant=tenant,
        user=owner,
        defaults={"role": "owner", "is_active": True},
    )
    if not membership_created and (membership.role != "owner" or not membership.is_active):
        membership.role = "owner"
        membership.is_active = True
        membership.save(update_fields=["role", "is_active", "updated_at"])

    plaintext_key = None
    api_key_id = None
    if not skip_api_key:
        plaintext_key = generate_api_key()
        api_key = SporeApiKey.objects.create(
            tenant=tenant,
            created_by=owner,
            name=key_name.strip(),
            prefix=key_prefix(plaintext_key),
            key_hash=hash_api_key(plaintext_key),
            is_active=True,
        )
        api_key_id = str(api_key.id)

    return ProvisionTenantResult(
        tenant=tenant,
        owner=owner,
        membership=membership,
        owner_created=owner_created,
        membership_created=membership_created,
        api_key_id=api_key_id,
        plaintext_key=plaintext_key,
        api_key_name=key_name.strip(),
    )
