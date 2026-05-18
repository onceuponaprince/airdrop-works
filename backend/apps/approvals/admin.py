from django.contrib import admin

from . import models


@admin.register(models.AirdropPayoutApproval)
class AirdropPayoutApprovalAdmin(admin.ModelAdmin):
    list_display = ("id", "batch_id", "approved", "approved_at", "created_at")
    list_filter = ("approved",)
    search_fields = ("batch_id", "notes")


@admin.register(models.ApprovalAudit)
class ApprovalAuditAdmin(admin.ModelAdmin):
    list_display = ("id", "approval", "action", "actor", "timestamp")
    readonly_fields = ("timestamp",)
    search_fields = ("notes",)
