from django.urls import path

from .views import IntegrityExportView, IntegrityWalletView

urlpatterns = [
    path("export/", IntegrityExportView.as_view(), name="integrity_export"),
    path("<str:wallet_address>/", IntegrityWalletView.as_view(), name="integrity_wallet"),
]
