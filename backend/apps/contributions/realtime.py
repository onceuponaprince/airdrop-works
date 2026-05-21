"""Push ingestion events to per-user WebSocket groups."""

from __future__ import annotations

import logging
from typing import Any

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

logger = logging.getLogger(__name__)


def broadcast_tweet_ingested(user_id: str, payload: dict[str, Any]) -> None:
    """Notify connected clients that a tweet was ingested and scored."""
    channel_layer = get_channel_layer()
    if not channel_layer:
        logger.debug("[TwitterFeed] No channel layer configured")
        return
    group = f"twitter_feed_{user_id}"
    try:
        async_to_sync(channel_layer.group_send)(
            group,
            {"type": "tweet.ingested", "payload": payload},
        )
    except Exception as exc:
        logger.warning("[TwitterFeed] broadcast failed user=%s: %s", user_id, exc)
