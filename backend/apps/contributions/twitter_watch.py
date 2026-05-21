"""Sync OAuth-linked Twitter accounts into contributions."""

from __future__ import annotations

import logging
from datetime import UTC, datetime, timedelta

import httpx
from django.conf import settings
from django.utils import timezone

from apps.accounts.models import TwitterConnection
from apps.contributions.models import CrawlSourceConfig

from .crawlers import CrawlResult, CrawledItem, _max_cursor_value
from .twitter_selenium import crawl_twitter_selenium

logger = logging.getLogger(__name__)


def _parse_timeline_rows(rows: list[dict], username: str) -> list[CrawledItem]:
    handle = username.lstrip("@").lower()
    items: list[CrawledItem] = []
    for row in rows:
        tweet_id = str(row.get("id", "")).strip()
        text = str(row.get("text", "")).strip()
        if not tweet_id or not text:
            continue
        created_at = None
        raw_created = row.get("created_at")
        if raw_created:
            try:
                created_at = datetime.fromisoformat(raw_created.replace("Z", "+00:00"))
            except ValueError:
                created_at = None
        items.append(
            CrawledItem(
                platform_content_id=tweet_id,
                content_text=text,
                content_url=f"https://twitter.com/{handle}/status/{tweet_id}",
                discovered_at=created_at,
                actor_handle=handle,
                metadata={"ingestion": "twitter_oauth"},
            )
        )
    return items


def crawl_twitter_oauth_timeline(
    *,
    access_token: str,
    twitter_user_id: str,
    username: str,
    since_id: str | None = None,
) -> CrawlResult:
    """Fetch the authenticated user's tweets with OAuth user context."""
    max_results = max(5, min(int(settings.TWITTER_MAX_RESULTS), 100))
    url = (
        f"https://api.twitter.com/2/users/{twitter_user_id}/tweets"
        f"?max_results={max_results}"
        "&tweet.fields=created_at"
        "&exclude=retweets,replies"
    )
    if since_id:
        url += f"&since_id={since_id}"
    response = httpx.get(
        url,
        headers={"Authorization": f"Bearer {access_token}"},
        timeout=20,
    )
    if response.status_code == 401:
        raise ValueError("Twitter access token expired — reconnect account")
    if response.status_code == 429:
        raise ValueError("Twitter rate limit — try again shortly")
    if response.status_code >= 400:
        raise ValueError(f"Twitter timeline error: {response.text[:200]}")
    payload = response.json()
    items = _parse_timeline_rows(payload.get("data") or [], username)
    return CrawlResult(
        items=items,
        next_cursor=_max_cursor_value([i.platform_content_id for i in items]),
    )


def ensure_crawl_source(connection: TwitterConnection) -> CrawlSourceConfig:
    """Ensure a CrawlSourceConfig exists for the linked handle."""
    config, _ = CrawlSourceConfig.objects.get_or_create(
        user=connection.user,
        platform="twitter",
        source_key=connection.twitter_username.lower(),
        defaults={"is_active": connection.watch_enabled, "metadata": {"oauth": True}},
    )
    if config.is_active != connection.watch_enabled:
        config.is_active = connection.watch_enabled
        config.save(update_fields=["is_active", "updated_at"])
    return config


def sync_twitter_connection(connection: TwitterConnection) -> CrawlResult:
    """Poll tweets for one linked account (API first, optional Selenium)."""
    config = ensure_crawl_source(connection)
    since_id = config.cursor or None
    try:
        result = crawl_twitter_oauth_timeline(
            access_token=connection.access_token,
            twitter_user_id=connection.twitter_user_id,
            username=connection.twitter_username,
            since_id=since_id,
        )
        connection.last_error = ""
    except Exception as exc:
        connection.last_error = str(exc)[:2000]
        if connection.use_selenium_fallback and getattr(
            settings, "TWITTER_SELENIUM_WATCH_ENABLED", False
        ):
            logger.warning(
                "[TwitterWatch] API failed for @%s, trying Selenium: %s",
                connection.twitter_username,
                exc,
            )
            result = crawl_twitter_selenium(connection.twitter_username)
            connection.metadata = {
                **dict(connection.metadata or {}),
                "last_ingestion": "selenium",
            }
        else:
            connection.save(update_fields=["last_error", "updated_at"])
            raise
    connection.last_synced_at = timezone.now()
    if result.next_cursor:
        config.cursor = result.next_cursor
        config.last_crawled_at = timezone.now()
        config.save(update_fields=["cursor", "last_crawled_at", "updated_at"])
    connection.save(update_fields=["last_synced_at", "last_error", "metadata", "updated_at"])
    return result


def token_expiring_soon(connection: TwitterConnection) -> bool:
    if not connection.token_expires_at:
        return False
    return connection.token_expires_at <= timezone.now() + timedelta(minutes=5)
