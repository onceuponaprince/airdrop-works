"""Platform crawler clients for Twitter, Reddit, Discord, and Telegram.

These crawlers fetch recent public messages and normalize them into a common payload
shape so tasks can upsert contributions and trigger AI scoring.
"""

from __future__ import annotations

import base64
import json
import logging
import time
from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import quote, unquote, urlencode
from urllib.request import Request, urlopen

from django.conf import settings

logger = logging.getLogger(__name__)
_REDDIT_TOKEN: str = ""
_REDDIT_TOKEN_EXPIRES_AT: float = 0.0


@dataclass
class CrawledItem:
    platform_content_id: str
    content_text: str
    content_url: str
    discovered_at: datetime | None = None
    actor_id: str = ""
    actor_handle: str = ""
    mentions: list[str] = field(default_factory=list)
    referenced_tweets: list[dict[str, str]] = field(default_factory=list)
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class CrawlResult:
    items: list[CrawledItem]
    next_cursor: str = ""


def _http_request_json(
    url: str,
    *,
    method: str = "GET",
    headers: dict[str, str] | None = None,
    data: bytes | None = None,
) -> Any:
    request = Request(url=url, headers=headers or {}, method=method, data=data)

    try:
        with urlopen(request, timeout=15) as response:
            payload = response.read().decode("utf-8")
            return json.loads(payload)
    except HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="ignore")
        logger.error("[Crawler] HTTP %s for %s: %s", exc.code, url, detail)
        detail_snippet = " ".join(detail.split())[:240]
        if detail_snippet:
            raise ValueError(f"HTTP {exc.code} calling {url}: {detail_snippet}") from exc
        raise ValueError(f"HTTP {exc.code} calling {url}") from exc
    except URLError as exc:
        logger.error("[Crawler] URL error for %s: %s", url, exc)
        raise ValueError(f"Network error calling {url}") from exc
    except json.JSONDecodeError as exc:
        logger.error("[Crawler] Invalid JSON for %s", url)
        raise ValueError("Invalid JSON payload from upstream platform") from exc


def _http_get_json(url: str, headers: dict[str, str] | None = None) -> dict[str, Any]:
    payload = _http_request_json(url, headers=headers)
    if not isinstance(payload, dict):
        raise ValueError("Unexpected JSON payload from upstream platform")
    return payload


def _max_cursor_value(cursor_values: list[str]) -> str:
    normalized = [str(value).strip() for value in cursor_values if str(value).strip()]
    if not normalized:
        return ""

    try:
        return str(max(int(value) for value in normalized))
    except (TypeError, ValueError):
        return max(normalized)


def _twitter_bearer_token() -> str:
    raw_token = str(settings.TWITTER_BEARER_TOKEN or "").strip()
    if not raw_token:
        raise ValueError("TWITTER_BEARER_TOKEN is not configured")

    # Some local env files store the bearer token URL-encoded (%2B, %2F, %3D).
    # Decode once before sending it to Twitter.
    return unquote(raw_token)


def crawl_twitter(username: str, since_id: str | None = None) -> CrawlResult:
    """Fetch recent tweets for a username using Twitter v2 API."""
    token = _twitter_bearer_token()

    encoded_username = quote(username.lstrip("@"))
    user_url = f"https://api.twitter.com/2/users/by/username/{encoded_username}"
    user_data = _http_get_json(user_url, headers={"Authorization": f"Bearer {token}"})

    user_id = user_data.get("data", {}).get("id")
    if not user_id:
        raise ValueError(f"Could not resolve Twitter user for @{username}")

    max_results = max(5, min(int(settings.TWITTER_MAX_RESULTS), 100))
    tweets_url = (
        f"https://api.twitter.com/2/users/{user_id}/tweets"
        f"?max_results={max_results}"
        "&tweet.fields=created_at,author_id,conversation_id,entities,referenced_tweets"
        "&expansions=referenced_tweets.id,author_id"
    )
    if since_id:
        tweets_url += f"&since_id={quote(str(since_id))}"
    tweets_data = _http_get_json(tweets_url, headers={"Authorization": f"Bearer {token}"})

    items: list[CrawledItem] = []
    for row in tweets_data.get("data", []):
        tweet_id = str(row.get("id", "")).strip()
        text = str(row.get("text", "")).strip()
        if not tweet_id or not text:
            continue

        created_at = None
        raw_created_at = row.get("created_at")
        if raw_created_at:
            try:
                created_at = datetime.fromisoformat(raw_created_at.replace("Z", "+00:00"))
            except ValueError:
                created_at = None

        mentions = []
        entities = row.get("entities")
        if isinstance(entities, dict):
            mention_rows = entities.get("mentions")
            if isinstance(mention_rows, list):
                for mention in mention_rows:
                    if not isinstance(mention, dict):
                        continue
                    username = str(mention.get("username", "")).strip().lower()
                    if username:
                        mentions.append(username)

        referenced_tweets = []
        raw_referenced = row.get("referenced_tweets")
        if isinstance(raw_referenced, list):
            for ref in raw_referenced:
                if not isinstance(ref, dict):
                    continue
                ref_id = str(ref.get("id", "")).strip()
                ref_type = str(ref.get("type", "")).strip()
                if ref_id and ref_type:
                    referenced_tweets.append({"id": ref_id, "type": ref_type})

        items.append(
            CrawledItem(
                platform_content_id=tweet_id,
                content_text=text,
                content_url=f"https://twitter.com/{encoded_username}/status/{tweet_id}",
                discovered_at=created_at,
                actor_id=str(row.get("author_id", "")).strip(),
                actor_handle=encoded_username.lower(),
                mentions=mentions,
                referenced_tweets=referenced_tweets,
            )
        )

    return CrawlResult(
        items=items,
        next_cursor=_max_cursor_value([item.platform_content_id for item in items]),
    )


def _get_reddit_access_token() -> str:
    global _REDDIT_TOKEN, _REDDIT_TOKEN_EXPIRES_AT

    client_id = settings.REDDIT_CLIENT_ID
    client_secret = settings.REDDIT_CLIENT_SECRET
    user_agent = settings.REDDIT_USER_AGENT
    if not client_id or not client_secret or not user_agent:
        raise ValueError(
            "REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET, and REDDIT_USER_AGENT must be configured"
        )

    now = time.time()
    if _REDDIT_TOKEN and now < _REDDIT_TOKEN_EXPIRES_AT:
        return _REDDIT_TOKEN

    basic_auth = base64.b64encode(f"{client_id}:{client_secret}".encode("utf-8")).decode("ascii")
    token_payload = _http_request_json(
        "https://www.reddit.com/api/v1/access_token",
        method="POST",
        headers={
            "Authorization": f"Basic {basic_auth}",
            "Content-Type": "application/x-www-form-urlencoded",
            "User-Agent": user_agent,
        },
        data=urlencode({"grant_type": "client_credentials"}).encode("utf-8"),
    )
    if not isinstance(token_payload, dict):
        raise ValueError("Unexpected Reddit token response payload")

    access_token = str(token_payload.get("access_token", "")).strip()
    if not access_token:
        raise ValueError("Reddit OAuth response did not include an access token")

    expires_in = int(token_payload.get("expires_in") or 3600)
    _REDDIT_TOKEN = access_token
    _REDDIT_TOKEN_EXPIRES_AT = now + max(expires_in - 60, 60)
    return _REDDIT_TOKEN


def crawl_reddit(subreddit: str, before_fullname: str | None = None) -> CrawlResult:
    """Fetch new posts from a subreddit via Reddit's OAuth API."""
    normalized_subreddit = subreddit.strip().lower().strip("/")
    if normalized_subreddit.startswith("r/"):
        normalized_subreddit = normalized_subreddit[2:]
    if not normalized_subreddit:
        raise ValueError("subreddit is required")

    token = _get_reddit_access_token()
    limit = max(1, min(int(settings.REDDIT_MAX_RESULTS), 100))
    url = (
        f"https://oauth.reddit.com/r/{quote(normalized_subreddit)}/new"
        f"?limit={limit}&raw_json=1"
    )
    if before_fullname:
        url += f"&before={quote(str(before_fullname))}"

    payload = _http_get_json(
        url,
        headers={
            "Authorization": f"Bearer {token}",
            "User-Agent": settings.REDDIT_USER_AGENT,
        },
    )
    listing = payload.get("data")
    if not isinstance(listing, dict):
        raise ValueError("Unexpected Reddit listing payload")

    children = listing.get("children")
    if not isinstance(children, list):
        raise ValueError("Unexpected Reddit listing children payload")

    next_cursor = ""
    items: list[CrawledItem] = []
    for index, child in enumerate(children):
        if not isinstance(child, dict):
            continue

        row = child.get("data")
        if not isinstance(row, dict):
            continue

        fullname = str(row.get("name") or "").strip()
        if not next_cursor and fullname:
            next_cursor = fullname
        post_id = str(row.get("id") or "").strip()
        title = str(row.get("title") or "").strip()
        body = str(row.get("selftext") or "").strip()
        text = "\n\n".join(part for part in [title, body] if part)
        if not text or not (fullname or post_id):
            continue

        permalink = str(row.get("permalink") or "").strip()
        raw_url = str(row.get("url") or "").strip()
        content_url = f"https://www.reddit.com{permalink}" if permalink else raw_url

        created_at = None
        raw_created_at = row.get("created_utc")
        if isinstance(raw_created_at, (int, float)):
            created_at = datetime.fromtimestamp(raw_created_at, tz=UTC)

        items.append(
            CrawledItem(
                platform_content_id=fullname or post_id,
                content_text=text,
                content_url=content_url,
                discovered_at=created_at,
                actor_id=str(row.get("author_fullname") or "").strip(),
                actor_handle=str(row.get("author") or "").strip().lower(),
                metadata={
                    "subreddit": normalized_subreddit,
                    "title": title,
                    "selftext": body,
                    "permalink": permalink,
                    "external_url": raw_url,
                },
            )
        )

    return CrawlResult(items=items, next_cursor=next_cursor)


def crawl_discord(channel_id: str, after_message_id: str | None = None) -> CrawlResult:
    """Fetch recent channel messages via Discord REST API."""
    token = settings.DISCORD_BOT_TOKEN
    if not token:
        raise ValueError("DISCORD_BOT_TOKEN is not configured")

    limit = max(1, min(int(settings.DISCORD_MAX_MESSAGES), 100))
    url = f"https://discord.com/api/v10/channels/{quote(channel_id)}/messages?limit={limit}"
    if after_message_id:
        url += f"&after={quote(str(after_message_id))}"
    data = _http_request_json(url, headers={"Authorization": f"Bot {token}"})

    if not isinstance(data, list):
        raise ValueError("Unexpected Discord response payload")

    items: list[CrawledItem] = []
    for row in data:
        message_id = str(row.get("id", "")).strip()
        text = str(row.get("content", "")).strip()
        if not message_id or not text:
            continue

        created_at = None
        raw_created_at = row.get("timestamp")
        if raw_created_at:
            try:
                created_at = datetime.fromisoformat(raw_created_at.replace("Z", "+00:00"))
            except ValueError:
                created_at = None

        items.append(
            CrawledItem(
                platform_content_id=message_id,
                content_text=text,
                content_url=f"https://discord.com/channels/@me/{quote(channel_id)}/{message_id}",
                discovered_at=created_at,
            )
        )

    return CrawlResult(
        items=items,
        next_cursor=_max_cursor_value([item.platform_content_id for item in items]),
    )


def crawl_telegram(chat_id: str, min_message_id: str | None = None) -> CrawlResult:
    """Fetch recent updates for a Telegram bot and filter by chat id.

    Telegram Bot API does not expose direct chat history fetch for arbitrary chats.
    This uses `getUpdates`, so bot must be present in target chat/channel.
    """
    token = settings.TELEGRAM_BOT_TOKEN
    if not token:
        raise ValueError("TELEGRAM_BOT_TOKEN is not configured")

    limit = max(1, min(int(settings.TELEGRAM_MAX_MESSAGES), 100))
    url = f"https://api.telegram.org/bot{token}/getUpdates?limit={limit}"
    payload = _http_get_json(url)

    updates = payload.get("result", [])
    if not isinstance(updates, list):
        raise ValueError("Unexpected Telegram response payload")

    items: list[CrawledItem] = []
    min_message_id_int: int | None = None
    if min_message_id:
        try:
            min_message_id_int = int(min_message_id)
        except ValueError:
            min_message_id_int = None

    for update in updates:
        message = update.get("message") or update.get("channel_post")
        if not isinstance(message, dict):
            continue

        msg_chat = str(message.get("chat", {}).get("id", ""))
        if msg_chat != str(chat_id):
            continue

        message_id = str(message.get("message_id", "")).strip()
        text = str(message.get("text", "")).strip()
        if not message_id or not text:
            continue

        if min_message_id_int is not None:
            try:
                if int(message_id) <= min_message_id_int:
                    continue
            except ValueError:
                continue

        date_value = message.get("date")
        created_at = None
        if isinstance(date_value, int):
            created_at = datetime.fromtimestamp(date_value, tz=UTC)

        items.append(
            CrawledItem(
                platform_content_id=message_id,
                content_text=text,
                content_url=f"https://t.me/c/{str(chat_id).replace('-100', '')}/{message_id}",
                discovered_at=created_at,
            )
        )

    return CrawlResult(
        items=items,
        next_cursor=_max_cursor_value([item.platform_content_id for item in items]),
    )
