"""Notification service for creating and delivering notifications."""
from typing import Any

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.db import transaction

from .models import Notification


class NotificationService:
    """Service layer for notification creation and real-time delivery."""

    @staticmethod
    def create_notification(
        user,
        notification_type: str,
        title: str,
        message: str,
        data: dict | None = None,
        deliver_realtime: bool = True,
    ) -> Notification:
        """
        Create a notification and optionally deliver via WebSocket.

        Args:
            user: The recipient User instance
            notification_type: One of Notification.NOTIFICATION_TYPES
            title: Short notification title
            message: Full notification body
            data: Optional JSON payload for client routing
            deliver_realtime: Whether to send via WebSocket immediately

        Returns:
            The created Notification instance
        """
        notification = Notification.objects.create(
            user=user,
            notification_type=notification_type,
            title=title,
            message=message,
            data=data or {},
        )

        if deliver_realtime:
            NotificationService.deliver_realtime(notification)

        return notification

    @staticmethod
    def deliver_realtime(notification: Notification) -> None:
        """Send notification to user's WebSocket group."""
        channel_layer = get_channel_layer()
        if channel_layer is None:
            return

        group_name = f"notifications_{notification.user_id}"

        async_to_sync(channel_layer.group_send)(
            group_name,
            {
                "type": "notification.send",
                "payload": {
                    "id": str(notification.id),
                    "notification_type": notification.notification_type,
                    "title": notification.title,
                    "message": notification.message,
                    "read": notification.read,
                    "data": notification.data,
                    "created_at": notification.created_at.isoformat(),
                },
            },
        )

    @staticmethod
    def broadcast(
        title: str,
        message: str,
        data: dict | None = None,
    ) -> list[Notification]:
        """
        Create broadcast notifications for all active users.
        Returns list of created notifications.
        """
        from django.contrib.auth import get_user_model

        User = get_user_model()

        notifications = []
        with transaction.atomic():
            for user in User.objects.filter(is_active=True):
                notification = Notification.objects.create(
                    user=user,
                    notification_type="system",
                    title=title,
                    message=message,
                    data=data or {},
                    is_broadcast=True,
                )
                notifications.append(notification)
                NotificationService.deliver_realtime(notification)

        return notifications

    # --- Integration helpers ---

    @staticmethod
    def notify_score_complete(user, contribution_id: str, score: int) -> Notification:
        """Notify user that their contribution has been scored."""
        tier = "exceptional" if score >= 80 else "solid" if score >= 50 else "participation"
        return NotificationService.create_notification(
            user=user,
            notification_type="score_complete",
            title=f"Contribution Scored — {tier.capitalize()}!",
            message=f"Your contribution received a score of {score}/100. Check your profile for details.",
            data={
                "contribution_id": contribution_id,
                "score": score,
                "tier": tier,
                "route": "/dashboard",
            },
        )

    @staticmethod
    def notify_appeal_resolved(user, appeal_id: str, approved: bool, reason: str = "") -> Notification:
        """Notify user of appeal resolution."""
        if approved:
            title = "Appeal Approved"
            message = "Your appeal has been reviewed and approved. Your score has been updated."
        else:
            title = "Appeal Denied"
            message = f"Your appeal was not approved. {reason}".strip()

        return NotificationService.create_notification(
            user=user,
            notification_type="appeal_resolved",
            title=title,
            message=message,
            data={
                "appeal_id": appeal_id,
                "approved": approved,
                "route": "/integrity",
            },
        )

    @staticmethod
    def notify_quest_completed(user, quest_id: str, quest_title: str, reward_amount: str = "") -> Notification:
        """Notify user of quest completion."""
        message = f"Congratulations! You completed '{quest_title}'."
        if reward_amount:
            message += f" Reward: {reward_amount}"

        return NotificationService.create_notification(
            user=user,
            notification_type="quest_completed",
            title="Quest Completed!",
            message=message,
            data={
                "quest_id": quest_id,
                "quest_title": quest_title,
                "reward_amount": reward_amount,
                "route": "/quests",
            },
        )

    @staticmethod
    def notify_quest_accepted(user, quest_id: str, quest_title: str) -> Notification:
        """Notify user of quest acceptance."""
        return NotificationService.create_notification(
            user=user,
            notification_type="quest_accepted",
            title="Quest Accepted",
            message=f"You've accepted '{quest_title}'. Good luck!",
            data={
                "quest_id": quest_id,
                "quest_title": quest_title,
                "route": "/quests",
            },
        )

    @staticmethod
    def notify_loot_ready(user, chest_id: str, rarity: str) -> Notification:
        """Notify user that a loot chest is ready to open."""
        rarity_emoji = {"legendary": "👑", "epic": "🔮", "rare": "💎", "uncommon": "✨", "common": "🎁"}.get(rarity, "🎁")

        return NotificationService.create_notification(
            user=user,
            notification_type="loot_ready",
            title=f"{rarity_emoji} Loot Chest Ready!",
            message=f"A {rarity} chest is waiting for you. Open it to reveal your reward!",
            data={
                "chest_id": chest_id,
                "rarity": rarity,
                "route": "/loot",
            },
        )

    @staticmethod
    def notify_badge_earned(user, badge_id: str, badge_name: str, rarity: str) -> Notification:
        """Notify user of badge/NFT earned."""
        return NotificationService.create_notification(
            user=user,
            notification_type="badge_earned",
            title="Badge Earned!",
            message=f"You've earned the {badge_name} badge ({rarity}).",
            data={
                "badge_id": badge_id,
                "badge_name": badge_name,
                "rarity": rarity,
                "route": "/dashboard",
            },
        )

    @staticmethod
    def notify_rank_up(user, new_rank: int) -> Notification:
        """Notify user of leaderboard rank advancement."""
        suffix = {1: "st", 2: "nd", 3: "rd"}.get(new_rank, "th")

        return NotificationService.create_notification(
            user=user,
            notification_type="rank_up",
            title="Rank Up!",
            message=f"Congratulations! You've reached {new_rank}{suffix} place on the leaderboard!",
            data={
                "rank": new_rank,
                "route": "/leaderboard",
            },
        )
