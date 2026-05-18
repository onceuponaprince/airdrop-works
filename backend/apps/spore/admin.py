from django import forms
from django.contrib import admin

from .models import (
    AuditLog,
    GraphEdge,
    GraphNode,
    Observation,
    ScoreRun,
    SporeApiKey,
    Tenant,
    TenantMembership,
    UsageDailyCounter,
    UsageEvent,
)


class TenantAdminForm(forms.ModelForm):
    llm_daily_limit = forms.IntegerField(required=False, min_value=1, label="LLM daily limit")
    llm_per_minute = forms.IntegerField(required=False, min_value=1, label="LLM per-minute limit")
    llm_warn_at_percent = forms.IntegerField(required=False, min_value=1, max_value=100, label="LLM warn at %")

    class Meta:
        model = Tenant
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


@admin.register(GraphNode)
class GraphNodeAdmin(admin.ModelAdmin):
    list_display = ("node_key", "node_type", "source_platform", "is_deleted", "updated_at")
    list_filter = ("node_type", "source_platform", "is_deleted")
    search_fields = ("node_key", "title")


@admin.register(GraphEdge)
class GraphEdgeAdmin(admin.ModelAdmin):
    list_display = (
        "edge_type",
        "source_platform",
        "from_node",
        "to_node",
        "weight",
        "last_seen_at",
    )
    list_filter = ("edge_type", "source_platform", "is_deleted")
    search_fields = ("from_node__node_key", "to_node__node_key")


@admin.register(Observation)
class ObservationAdmin(admin.ModelAdmin):
    list_display = (
        "source_platform",
        "event_type",
        "actor_external_id",
        "target_external_id",
        "occurred_at",
    )
    list_filter = ("source_platform", "event_type")
    search_fields = ("source_event_id", "actor_external_id", "target_external_id")


@admin.register(ScoreRun)
class ScoreRunAdmin(admin.ModelAdmin):
    list_display = ("contribution_id", "source_platform", "score_version", "final_score", "confidence")
    list_filter = ("source_platform", "score_version")
    search_fields = ("contribution_id",)


@admin.register(Tenant)
class TenantAdmin(admin.ModelAdmin):
    list_display = ("slug", "name", "plan", "is_active", "updated_at")
    list_filter = ("plan", "is_active")
    search_fields = ("slug", "name")
    form = TenantAdminForm


@admin.register(TenantMembership)
class TenantMembershipAdmin(admin.ModelAdmin):
    list_display = ("tenant", "user", "role", "is_active", "updated_at")
    list_filter = ("role", "is_active")
    search_fields = ("tenant__slug", "user__username", "user__wallet_address")


@admin.register(SporeApiKey)
class SporeApiKeyAdmin(admin.ModelAdmin):
    list_display = ("tenant", "name", "prefix", "is_active", "last_used_at", "updated_at")
    list_filter = ("is_active",)
    search_fields = ("tenant__slug", "name", "prefix")


@admin.register(UsageEvent)
class UsageEventAdmin(admin.ModelAdmin):
    list_display = ("tenant", "metric", "units", "status_code", "created_at")
    list_filter = ("metric", "status_code")
    search_fields = ("tenant__slug", "request_id")


@admin.register(UsageDailyCounter)
class UsageDailyCounterAdmin(admin.ModelAdmin):
    list_display = ("tenant", "metric", "day", "count")
    list_filter = ("metric", "day")
    search_fields = ("tenant__slug",)


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ("tenant", "action", "target_type", "target_id", "created_at")
    list_filter = ("action", "target_type")
    search_fields = ("tenant__slug", "target_id")

