"""URL routing for notifications API."""
from django.urls import path
from .views import (
    NotificationListView,
    NotificationSummaryView,
    MarkReadView,
    MarkAllReadView,
    DeleteNotificationView,
    BroadcastCreateView,
)

urlpatterns = [
    path("", NotificationListView.as_view(), name="notification-list"),
    path("summary/", NotificationSummaryView.as_view(), name="notification-summary"),
    path("<uuid:notification_id>/read/", MarkReadView.as_view(), name="notification-mark-read"),
    path("read-all/", MarkAllReadView.as_view(), name="notification-mark-all-read"),
    path("<uuid:notification_id>/", DeleteNotificationView.as_view(), name="notification-delete"),
    path("broadcast/", BroadcastCreateView.as_view(), name="notification-broadcast"),
]
