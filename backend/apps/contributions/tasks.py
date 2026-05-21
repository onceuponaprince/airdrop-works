"""Celery tasks for incremental multi-platform crawling into ``Contribution``.

``crawl_source_config_task`` advances per-source cursors and enqueues
``score_contribution_task`` only for newly created rows. Failures update
``last_error`` and re-raise for Celery retry (bounded by ``max_retries``).
"""

from __future__ import annotations

import logging
from collections.abc import Iterable

from celery import shared_task
from django.db import transaction
from django.utils import timezone

from apps.accounts.models import User
from apps.ai_core.tasks import score_contribution_task
from apps.contributions.models import Contribution, CrawlSourceConfig
from apps.spore.services.ingestion import record_reddit_item, record_twitter_item

from .crawlers import CrawlResult, CrawledItem, crawl_discord, crawl_reddit, crawl_telegram, crawl_twitter
from .realtime import broadcast_tweet_ingested
from .sentiment import analyze_sentiment
from .twitter_watch import sync_twitter_connection

logger = logging.getLogger(__name__)

MAX_LAST_ERROR_LEN = 2000


def _item_dimension_explanations(item: CrawledItem) -> dict[str, object]:
    """Build ``dimension_explanations`` extras for Spore (author, mentions, subreddit)."""
    extras: dict[str, object] = {
        "spore_author": (item.actor_handle or "").strip().lower(),
        "spore_mentions": item.mentions or [],
        "sentiment": analyze_sentiment(item.content_text),
    }
    subreddit = str((item.metadata or {}).get("subreddit") or "").strip().lower()
    if subreddit:
        extras["spore_subreddit"] = subreddit
    return extras


def _persist_items(user: User, platform: str, items: Iterable[CrawledItem]) -> int:
    """Store crawled items and enqueue scoring for newly created contributions."""
    created_count = 0

    for item in items:
        dimension_explanations = _item_dimension_explanations(item)
        contribution, created = Contribution.objects.get_or_create(
            platform=platform,
            platform_content_id=item.platform_content_id,
            defaults={
                "user": user,
                "content_text": item.content_text,
                "content_url": item.content_url,
                "created_at": item.discovered_at or timezone.now(),
                "dimension_explanations": dimension_explanations,
            },
        )

        if platform == "twitter":
            record_twitter_item(source_handle=item.actor_handle or "", item=item)
        elif platform == "reddit":
            record_reddit_item(subreddit=str((item.metadata or {}).get("subreddit") or ""), item=item)

        if platform in {"twitter", "reddit"} and not created:
            extras = dict(contribution.dimension_explanations or {})
            extras.update(dimension_explanations)
            Contribution.objects.filter(id=contribution.id).update(dimension_explanations=extras)

        if created:
            created_count += 1
            score_contribution_task.delay(str(contribution.id))
            if platform == "twitter":
                sentiment = (contribution.dimension_explanations or {}).get("sentiment", {})
                broadcast_tweet_ingested(
                    str(user.id),
                    {
                        "contributionId": str(contribution.id),
                        "platformContentId": contribution.platform_content_id,
                        "text": contribution.content_text[:280],
                        "contentUrl": contribution.content_url,
                        "sentiment": sentiment,
                        "createdAt": contribution.created_at.isoformat(),
                    },
                )

    return created_count


def _run_platform_crawl(config: CrawlSourceConfig) -> CrawlResult:
    """Dispatch to the platform crawler using ``source_key`` and stored ``cursor``."""
    if config.platform == "twitter":
        return crawl_twitter(username=config.source_key, since_id=config.cursor or None)

    if config.platform == "reddit":
        return crawl_reddit(subreddit=config.source_key, before_fullname=config.cursor or None)

    if config.platform == "discord":
        return crawl_discord(channel_id=config.source_key, after_message_id=config.cursor or None)

    if config.platform == "telegram":
        return crawl_telegram(chat_id=config.source_key, min_message_id=config.cursor or None)

    raise ValueError(f"Unsupported crawler platform: {config.platform}")


@shared_task(bind=True, max_retries=2, default_retry_delay=30, name="contributions.crawl_source_config")
def crawl_source_config_task(self, source_config_id: str) -> dict[str, int | str]:
    """Crawl one configured source incrementally and update cursor state."""
    config = (
        CrawlSourceConfig.objects.select_related("user")
        .filter(id=source_config_id)
        .first()
    )
    if not config:
        logger.warning("[Crawler] Source config %s not found", source_config_id)
        return {"status": "missing", "created": 0, "fetched": 0}

    if not config.is_active:
        return {"status": "inactive", "created": 0, "fetched": 0}

    try:
        crawl_result = _run_platform_crawl(config)
        created_count = _persist_items(config.user, config.platform, crawl_result.items)
        finished_at = timezone.now()

        with transaction.atomic():
            config.last_crawled_at = finished_at
            config.last_error = ""
            metadata = dict(config.metadata or {})
            if crawl_result.next_cursor:
                config.cursor = crawl_result.next_cursor
            metadata.update(
                {
                    "last_status": "ok",
                    "last_fetched_count": len(crawl_result.items),
                    "last_created_count": created_count,
                    "last_run_at": finished_at.isoformat(),
                    "last_cursor": config.cursor,
                }
            )
            config.metadata = metadata
            config.save(
                update_fields=["last_crawled_at", "last_error", "cursor", "metadata", "updated_at"]
            )

        logger.info(
            "[Crawler/%s] user=%s source=%s fetched=%d created=%d cursor=%s",
            config.platform,
            config.user_id,
            config.source_key,
            len(crawl_result.items),
            created_count,
            config.cursor,
        )

        return {
            "status": "ok",
            "platform": config.platform,
            "fetched": len(crawl_result.items),
            "created": created_count,
            "cursor": config.cursor,
        }
    except Exception as exc:
        finished_at = timezone.now()
        config.last_crawled_at = finished_at
        config.last_error = str(exc)[:MAX_LAST_ERROR_LEN]
        metadata = dict(config.metadata or {})
        metadata.update(
            {
                "last_status": "failed",
                "last_run_at": finished_at.isoformat(),
            }
        )
        config.metadata = metadata
        config.save(update_fields=["last_crawled_at", "last_error", "metadata", "updated_at"])
        logger.error("[Crawler/%s] source=%s failed: %s", config.platform, config.source_key, exc)
        raise self.retry(exc=exc)


@shared_task(bind=True, max_retries=1, default_retry_delay=60, name="contributions.crawl_all_active_sources")
def crawl_all_active_sources_task(self, user_id: str | None = None) -> dict[str, int]:
    """Queue crawl tasks for all active source configs.

    Used by periodic celery beat scheduling and manual "crawl all" API trigger.
    """
    queryset = CrawlSourceConfig.objects.filter(is_active=True)
    if user_id:
        queryset = queryset.filter(user_id=user_id)

    queued = 0
    for source in queryset.iterator():
        crawl_source_config_task.delay(str(source.id))
        queued += 1

    logger.info("[Crawler/AllActive] user=%s queued=%d", user_id or "ALL", queued)
    return {"queued": queued}


@shared_task(bind=True, max_retries=2, default_retry_delay=60, name="contributions.sync_twitter_connection")
def sync_twitter_connection_task(self, connection_id: str) -> dict[str, int | str]:
    """Poll OAuth-linked Twitter timeline and ingest new tweets."""
    from apps.accounts.models import TwitterConnection

    connection = (
        TwitterConnection.objects.select_related("user")
        .filter(id=connection_id, watch_enabled=True)
        .first()
    )
    if not connection:
        return {"status": "missing", "created": 0, "fetched": 0}

    try:
        crawl_result = sync_twitter_connection(connection)
        created_count = _persist_items(connection.user, "twitter", crawl_result.items)
        return {
            "status": "ok",
            "fetched": len(crawl_result.items),
            "created": created_count,
        }
    except Exception as exc:
        logger.error("[TwitterWatch] connection=%s failed: %s", connection_id, exc)
        raise self.retry(exc=exc)


@shared_task(name="contributions.sync_all_twitter_watches")
def sync_all_twitter_watches_task() -> dict[str, int]:
    """Queue sync for every active Twitter OAuth connection."""
    from apps.accounts.models import TwitterConnection

    queued = 0
    for conn_id in TwitterConnection.objects.filter(watch_enabled=True).values_list("id", flat=True):
        sync_twitter_connection_task.delay(str(conn_id))
        queued += 1
    return {"queued": queued}
