"""WebSocket consumer for live Twitter ingestion feed."""

from __future__ import annotations

from channels.generic.websocket import AsyncJsonWebsocketConsumer


class TwitterFeedConsumer(AsyncJsonWebsocketConsumer):
    """Stream tweet.ingested events for the authenticated user."""

    async def connect(self):
        user = self.scope.get("user")
        if user is None or not getattr(user, "is_authenticated", False):
            await self.close(code=4401)
            return
        self.user_id = str(user.id)
        self.group_name = f"twitter_feed_{self.user_id}"
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()
        await self.send_json(
            {
                "type": "connected",
                "message": "Twitter feed connected",
                "userId": self.user_id,
            }
        )

    async def disconnect(self, close_code):
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def tweet_ingested(self, event):
        await self.send_json({"type": "tweet.ingested", **event.get("payload", {})})
