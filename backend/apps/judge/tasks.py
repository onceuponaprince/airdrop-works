"""Legacy Celery task wrappers for judge module compatibility."""
import logging

from celery import shared_task

from apps.ai_core.workflow import run_scoring_pipeline

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3, default_retry_delay=30, name="judge.score_contribution")
def score_contribution_task(self, contribution_id: str):
    """Compatibility wrapper preserving legacy task name while delegating to ai_core."""
    logger.info("[Judge/CompatTask] Delegating contribution %s to ai_core workflow", contribution_id)
    try:
        return run_scoring_pipeline(contribution_id=contribution_id)
    except Exception as exc:
        logger.error("[Judge/CompatTask] Scoring failed for %s: %s", contribution_id, exc)
        self.retry(exc=exc)
