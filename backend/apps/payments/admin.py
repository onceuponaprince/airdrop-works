from django import forms
from django.contrib import admin

from .models import CreditTransaction, Subscription, UserSubscription


class UserSubscriptionAdminForm(forms.ModelForm):
    llm_daily_limit = forms.IntegerField(required=False, min_value=1, label="LLM daily limit")
    llm_per_minute = forms.IntegerField(required=False, min_value=1, label="LLM per-minute limit")
    llm_warn_at_percent = forms.IntegerField(required=False, min_value=1, max_value=100, label="LLM warn at %")

    class Meta:
        model = UserSubscription
        fields = "__all__"

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        budget = (self.instance.metadata or {}).get("ai_llm_budget", {})
        self.fields["llm_daily_limit"].initial = budget.get("daily_limit")
        self.fields["llm_per_minute"].initial = budget.get("per_minute")
        self.fields["llm_warn_at_percent"].initial = budget.get("warn_at_percent")

    def save(self, commit=True):
        instance = super().save(commit=False)
        metadata = dict(instance.metadata or {})
        metadata["ai_llm_budget"] = {
            "daily_limit": self.cleaned_data.get("llm_daily_limit") or None,
            "per_minute": self.cleaned_data.get("llm_per_minute") or None,
            "warn_at_percent": self.cleaned_data.get("llm_warn_at_percent") or None,
        }
        instance.metadata = metadata
        if commit:
            instance.save()
        return instance


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
    form = UserSubscriptionAdminForm


@admin.register(CreditTransaction)
class CreditTransactionAdmin(admin.ModelAdmin):
    list_display = ["user", "amount", "reason", "balance_after", "created_at"]
    list_filter = ["reason"]
    raw_id_fields = ["user"]
