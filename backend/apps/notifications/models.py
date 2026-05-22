"""Notification model for persistent in-app notifications."""
from django.conf import settings
from django.db import models

from common.models import BaseModel


class Notification(BaseModel):
    """
    Persistent in-app notification for AI(r)Drop users.
    
    Supports real-time delivery via WebSocket and cross-device sync.
    Notifications are created by the system in response to events like
    score completion, appeal resolution, quest completion, or loot ready.
    """

    NOTIFICATION_TYPES = [
        ("score_complete", "Score Complete"),
        ("appeal_resolved", "Appeal Resolved"),
        ("quest_completed", "Quest Completed"),
        ("loot_ready", "Loot Ready"),
        ("quest_accepted", "Quest Accepted"),
        ("badge_earned", "Badge Earned"),
        ("rank_up", "Rank Up"),
        ("system", "System"),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notifications",
        help_text="Recipient of the notification",
    )

    notification_type = models.CharField(
        max_length=32,
        choices=NOTIFICATION_TYPES,
        db_index=True,
        help_text="Category of notification for filtering and styling",
    )

    title = models.CharField(max_length=255)
    message = models.TextField()

    read = models.BooleanField(default=False, db_index=True)
    read_at = models.DateTimeField(null=True, blank=True)

    # Additional structured data (e.g., {contribution_id, score, quest_id})
    data = models.JSONField(
        default=dict,
        blank=True,
        help_text="Structured payload for client-side routing and display",
    )

    # For broadcast notifications (admin-sent)
    is_broadcast = models.BooleanField(
        default=False,
        db_index=True,
        help_text="True for system-wide admin broadcasts",
    )

    # Soft delete
    deleted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "notifications"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["user", "read", "-created_at"]),
            models.Index(fields=["user", "notification_type", "-created_at"]),
            models.Index(fields=["is_broadcast", "-created_at"]),
        ]

    def __str__(self) -> str:
        read_status = "read" if self.read else "unread"
        return f"[{self.notification_type}] {self.title} ({read_status})"

    def mark_read(self) -> None:
        """Mark notification as read with timestamp."""
        from django.utils import timezone

        if not self.read:
            self.read = True
            self.read_at = timezone.now()
            self.save(update_fields=["read", "read_at", "updated_at"])

    def soft_delete(self) -> None:
        """Soft delete the notification."""
        from django.utils import timezone

        self.deleted_at = timezone.now()
        self.save(update_fields=["deleted_at", "updated_at"])
