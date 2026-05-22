"""Django admin for Notification model with broadcast action."""
from django.contrib import admin
from .models import Notification


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "notification_type", "title", "read", "is_broadcast", "created_at")
    list_filter = ("notification_type", "read", "is_broadcast", "created_at")
    search_fields = ("title", "message", "user__wallet_address")
    readonly_fields = ("created_at", "updated_at", "read_at")
    actions = ["mark_all_read", "soft_delete_selected"]

    def mark_all_read(self, request, queryset):
        from django.utils import timezone
        now = timezone.now()
        updated = queryset.update(read=True, read_at=now)
        self.message_user(request, f"Marked {updated} notifications as read.")
    mark_all_read.short_description = "Mark selected as read"

    def soft_delete_selected(self, request, queryset):
        from django.utils import timezone
        now = timezone.now()
        updated = queryset.update(deleted_at=now)
        self.message_user(request, f"Soft-deleted {updated} notifications.")
    soft_delete_selected.short_description = "Soft delete selected"
