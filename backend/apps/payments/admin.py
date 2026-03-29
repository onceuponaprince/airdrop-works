from django.contrib import admin

from .models import Subscription


@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display = ["tenant", "user", "plan", "status", "current_period_end", "stripe_customer_id"]
    list_filter = ["plan", "status"]
    raw_id_fields = ["tenant", "user"]
