"""Notification API views: list, mark read, mark all, delete, summary, and admin broadcast."""
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from rest_framework import status
from django.shortcuts import get_object_or_404
from django.utils import timezone

from .models import Notification
from .serializers import (
    NotificationSerializer,
    NotificationCreateSerializer,
    BroadcastNotificationSerializer,
    NotificationSummarySerializer,
)


class NotificationListView(APIView):
    """List user's notifications (optionally filter by read status)."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Return paginated list, newest first. Supports ?read=true/false."""
        qs = Notification.objects.filter(user=request.user, deleted_at__isnull=True)
        read_param = request.query_params.get("read")
        if read_param is not None:
            qs = qs.filter(read=read_param.lower() == "true")
        notifications = qs[:50]  # Simple limit; add pagination later if needed
        data = NotificationSerializer(notifications, many=True).data
        return Response({"results": data, "count": len(data)})


class NotificationSummaryView(APIView):
    """Unread/total counts for bell badge."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = Notification.objects.filter(user=request.user, deleted_at__isnull=True)
        unread = qs.filter(read=False).count()
        total = qs.count()
        return Response(NotificationSummarySerializer({"unread_count": unread, "total_count": total}).data)


class MarkReadView(APIView):
    """Mark single notification as read."""

    permission_classes = [IsAuthenticated]

    def post(self, request, notification_id):
        notification = get_object_or_404(
            Notification, id=notification_id, user=request.user, deleted_at__isnull=True
        )
        notification.mark_read()
        return Response(NotificationSerializer(notification).data)


class MarkAllReadView(APIView):
    """Mark all unread notifications as read for current user."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        now = timezone.now()
        updated = Notification.objects.filter(
            user=request.user, read=False, deleted_at__isnull=True
        ).update(read=True, read_at=now, updated_at=now)
        return Response({"marked_read": updated})


class DeleteNotificationView(APIView):
    """Soft-delete a notification."""

    permission_classes = [IsAuthenticated]

    def delete(self, request, notification_id):
        notification = get_object_or_404(
            Notification, id=notification_id, user=request.user, deleted_at__isnull=True
        )
        notification.soft_delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class BroadcastCreateView(APIView):
    """Admin-only endpoint to broadcast system notification to all users."""

    permission_classes = [IsAdminUser]

    def post(self, request):
        serializer = BroadcastNotificationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        notifications = serializer.save()
        return Response(
            {"created": len(notifications), "broadcast": True},
            status=status.HTTP_201_CREATED,
        )
