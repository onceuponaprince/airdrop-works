"""Audit logging helpers."""

from __future__ import annotations

from apps.spore.models import AuditLog


def log_audit_event(
    tenant,
    action: str,
    user=None,
    api_key=None,
    target_type: str = "",
    target_id: str = "",
    metadata=None,
):
    AuditLog.objects.create(
        tenant=tenant,
        user=user,
        api_key=api_key,
        action=action,
        target_type=target_type,
        target_id=target_id,
        metadata=metadata or {},
    )

