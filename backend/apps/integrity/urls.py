from django.urls import path

from .appeals_views import AppealCreateView, AppealResolveView, MyAppealsView
from .console_views import (
    ProtocolConsoleAppealsView,
    ProtocolConsoleOverviewView,
    ProtocolConsoleWalletsView,
)
from .views import IntegrityExportView, IntegrityWalletView

urlpatterns = [
    path("appeals/", AppealCreateView.as_view(), name="integrity_appeal_create"),
    path("appeals/me/", MyAppealsView.as_view(), name="integrity_appeals_me"),
    path("appeals/<uuid:appeal_id>/resolve/", AppealResolveView.as_view(), name="integrity_appeal_resolve"),
    path("console/overview/", ProtocolConsoleOverviewView.as_view(), name="integrity_console_overview"),
    path("console/wallets/", ProtocolConsoleWalletsView.as_view(), name="integrity_console_wallets"),
    path("console/appeals/", ProtocolConsoleAppealsView.as_view(), name="integrity_console_appeals"),
    path("export/", IntegrityExportView.as_view(), name="integrity_export"),
    path("<str:wallet_address>/", IntegrityWalletView.as_view(), name="integrity_wallet"),
]
