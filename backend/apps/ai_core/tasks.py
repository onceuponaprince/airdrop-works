"""Celery task entrypoints for AI core workflows."""

import logging

from celery import shared_task

from .workflow import run_scoring_pipeline

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=30, name="ai_core.score_contribution")
def score_contribution_task(self, contribution_id: str):
    try:
        return run_scoring_pipeline(contribution_id=contribution_id)
    except Exception as exc:
        logger.error("[AICore/Task] Scoring failed for %s: %s", contribution_id, exc)
        self.retry(exc=exc)
