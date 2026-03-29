"""Tenant resolution and access control helpers."""

from __future__ import annotations

from apps.spore.models import TenantMembership


def resolve_request_tenant(request):
    if hasattr(request, "spore_tenant") and request.spore_tenant:
        return request.spore_tenant

    tenant_slug = request.headers.get("X-SPORE-TENANT", "").strip()
    queryset = TenantMembership.objects.select_related("tenant").filter(
        user=request.user,
        is_active=True,
        tenant__is_active=True,
    )
    if tenant_slug:
        membership = queryset.filter(tenant__slug=tenant_slug).first()
        if membership:
            request.spore_tenant = membership.tenant
            request.spore_membership_role = membership.role
            return membership.tenant
        return None

    membership = queryset.order_by("created_at").first()
    if membership:
        request.spore_tenant = membership.tenant
        request.spore_membership_role = membership.role
        return membership.tenant
    return None


def has_tenant_admin_role(request) -> bool:
    if getattr(request.user, "is_staff", False):
        return True
    role = getattr(request, "spore_membership_role", "")
    return role in {"owner", "admin"}


def default_tenant_for_user(user):
    membership = (
        TenantMembership.objects.select_related("tenant")
        .filter(
            user=user,
            is_active=True,
            tenant__is_active=True,
        )
        .order_by("created_at")
        .first()
    )
    return membership.tenant if membership else None

