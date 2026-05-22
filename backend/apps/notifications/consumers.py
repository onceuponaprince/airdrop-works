"""WebSocket consumer for real-time notification delivery."""
from __future__ import annotations

import json
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.db import database_sync_to_async


class NotificationConsumer(AsyncJsonWebsocketConsumer):
    """
    WebSocket consumer for real-time notification streaming.
    
    Authenticated users connect to receive live notifications as they are
    created by the system. Supports reconnection with notification sync.
    """

    async def connect(self):
        user = self.scope.get("user")
        if user is None or not getattr(user, "is_authenticated", False):
            await self.close(code=4401)  # Unauthorized
            return

        self.user_id = str(user.id)
        self.group_name = f"notifications_{self.user_id}"

        # Join user-specific notification group
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

        # Send connection confirmation with unread count
        unread_count = await self.get_unread_count(user)
        await self.send_json({
            "type": "connected",
            "message": "Notification stream connected",
            "userId": self.user_id,
            "unreadCount": unread_count,
        })

    async def disconnect(self, close_code):
        if hasattr(self, "group_name"):
            await self.channel_layer.group_discard(
                self.group_name, self.channel_name
            )

    # Handler for notification.send channel messages
    async def notification_send(self, event):
        """Receive notification from channel layer and send to WebSocket."""
        await self.send_json({
            "type": "notification.new",
            "payload": event.get("payload", {}),
        })

    @database_sync_to_async
    def get_unread_count(self, user) -> int:
        """Get current unread count for the user."""
        from .models import Notification

        return Notification.objects.filter(
            user=user,
            read=False,
            deleted_at__isnull=True,
        ).count()

    # Optional: Handle client-side mark-read from WebSocket
    async def receive_json(self, content):
        """Handle incoming WebSocket messages from client."""
        message_type = content.get("type")

        if message_type == "mark_read":
            notification_id = content.get("notificationId")
            if notification_id:
                success = await self.mark_notification_read(notification_id)
                await self.send_json({
                    "type": "mark_read.confirm",
                    "notificationId": notification_id,
                    "success": success,
                })

        elif message_type == "mark_all_read":
            count = await self.mark_all_read()
            await self.send_json({
                "type": "mark_all_read.confirm",
                "markedRead": count,
            })

        elif message_type == "ping":
            await self.send_json({"type": "pong"})

    @database_sync_to_async
    def mark_notification_read(self, notification_id: str) -> bool:
        """Mark a notification as read by ID."""
        from django.utils import timezone
        from .models import Notification

        try:
            notification = Notification.objects.get(
                id=notification_id,
                user_id=self.user_id,
                deleted_at__isnull=True,
            )
            notification.mark_read()
            return True
        except Notification.DoesNotExist:
            return False

    @database_sync_to_async
    def mark_all_read(self) -> int:
        """Mark all notifications as read."""
        from django.utils import timezone
        from .models import Notification

        return Notification.objects.filter(
            user_id=self.user_id,
            read=False,
            deleted_at__isnull=True,
        ).update(
            read=True,
            read_at=timezone.now(),
        )
