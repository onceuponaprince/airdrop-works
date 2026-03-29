"""Celery tasks for SPORE embedding and graph propagation."""

from __future__ import annotations

from datetime import timedelta

from celery import shared_task
from django.utils import timezone

from apps.spore.models import AuditLog
from apps.spore.services.ingestion import sporulate_recent_nodes


@shared_task(bind=True, max_retries=2, default_retry_delay=30, name="spore.sporulate_recent_nodes")
def sporulate_recent_nodes_task(self, limit: int = 100) -> dict[str, int]:
    created = sporulate_recent_nodes(limit=limit)
    return {"status": "ok", "semantic_edges_created": created}


@shared_task(bind=True, max_retries=1, default_retry_delay=60, name="spore.purge_audit_logs")
def purge_audit_logs_task(self, retention_days: int = 30) -> dict[str, int]:
    cutoff = timezone.now() - timedelta(days=retention_days)
    deleted, _ = AuditLog.objects.filter(created_at__lt=cutoff).delete()
    return {"status": "ok", "deleted_rows": deleted}

