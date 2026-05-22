"""DRF serializers for Notification API."""
from rest_framework import serializers

from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    """Full notification serializer for list/detail views."""

    time_since = serializers.SerializerMethodField()

    class Meta:
        model = Notification
        fields = [
            "id",
            "notification_type",
            "title",
            "message",
            "read",
            "read_at",
            "data",
            "is_broadcast",
            "created_at",
            "updated_at",
            "time_since",
        ]
        read_only_fields = [
            "id",
            "notification_type",
            "title",
            "message",
            "data",
            "is_broadcast",
            "created_at",
            "updated_at",
        ]

    def get_time_since(self, obj: Notification) -> str:
        """Human-readable relative time (e.g., '2 hours ago')."""
        from django.utils.timesince import timesince

        return timesince(obj.created_at)


class NotificationCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating notifications (internal use / admin)."""

    class Meta:
        model = Notification
        fields = [
            "user",
            "notification_type",
            "title",
            "message",
            "data",
            "is_broadcast",
        ]

    def create(self, validated_data):
        from .service import NotificationService

        notification = Notification.objects.create(**validated_data)

        # Trigger real-time delivery
        NotificationService.deliver_realtime(notification)

        return notification


class BroadcastNotificationSerializer(serializers.Serializer):
    """Serializer for admin broadcast creation."""

    title = serializers.CharField(max_length=255)
    message = serializers.CharField()
    notification_type = serializers.ChoiceField(
        choices=[("system", "System")],
        default="system",
    )
    data = serializers.JSONField(default=dict, required=False)

    def create(self, validated_data):
        from .service import NotificationService

        return NotificationService.broadcast(
            title=validated_data["title"],
            message=validated_data["message"],
            data=validated_data.get("data", {}),
        )


class NotificationSummarySerializer(serializers.Serializer):
    """Summary counts for the notification bell badge."""

    unread_count = serializers.IntegerField()
    total_count = serializers.IntegerField()
