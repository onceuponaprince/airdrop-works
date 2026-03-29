from django.urls import path
from .views import AdminOverviewView, HealthCheckView

urlpatterns = [
    path("health/", HealthCheckView.as_view(), name="health_check"),
    path("admin/overview/", AdminOverviewView.as_view(), name="admin_overview"),
]
