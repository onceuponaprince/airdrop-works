"""
Celery tasks for accounts domain.
"""

from __future__ import annotations

import logging

from celery import shared_task

from apps.accounts.models import User
from .social_sync_service import SocialSyncService

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=2, name="accounts.sync_all_social_accounts")
def sync_all_social_accounts(self) -> dict:
    """Periodic task that syncs activity from connected social accounts."""
    users = User.objects.filter(social_accounts__isnull=False).distinct()

    results = []
    for user in users:
        try:
            result = SocialSyncService.sync_user_accounts(user)
            results.append(result)
        except Exception as exc:
            logger.exception("Social sync failed for user %s: %s", user.id, exc)

    return {"status": "completed", "users_processed": len(results)}