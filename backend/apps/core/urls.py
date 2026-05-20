from django.urls import path
from .views import AdminOverviewView, HealthCheckView, DebugSentryView

urlpatterns = [
    path("health/", HealthCheckView.as_view(), name="health_check"),
    path("admin/overview/", AdminOverviewView.as_view(), name="admin_overview"),
    path("debug/sentry/", DebugSentryView.as_view(), name="debug_sentry"),
]
