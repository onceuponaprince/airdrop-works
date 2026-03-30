from django.contrib import admin

from .models import CreditTransaction, Subscription, UserSubscription


@admin.register(Subscription)
class SubscriptionAdmin(admin.ModelAdmin):
    list_display = ["tenant", "user", "plan", "status", "current_period_end", "stripe_customer_id"]
    list_filter = ["plan", "status"]
    raw_id_fields = ["tenant", "user"]


@admin.register(UserSubscription)
class UserSubscriptionAdmin(admin.ModelAdmin):
    list_display = ["user", "plan", "status", "credits_remaining", "monthly_credits", "credits_reset_at"]
    list_filter = ["plan", "status"]
    raw_id_fields = ["user"]


@admin.register(CreditTransaction)
class CreditTransactionAdmin(admin.ModelAdmin):
    list_display = ["user", "amount", "reason", "balance_after", "created_at"]
    list_filter = ["reason"]
    raw_id_fields = ["user"]
