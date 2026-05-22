from django.contrib import admin
from .models import Referral


@admin.register(Referral)
class ReferralAdmin(admin.ModelAdmin):
    list_display = ("code", "referrer", "referred", "source", "created_at", "converted_at")
    search_fields = ("code", "referrer__wallet_address", "referred__wallet_address")
    list_filter = ("source", "created_at")
    readonly_fields = ("created_at", "updated_at")