from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from . import views

urlpatterns = [
    path("wallet-verify/", views.WalletVerifyView.as_view(), name="wallet_verify"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("me/", views.UserProfileView.as_view(), name="user_profile"),
    path("me/export/", views.UserDataExportView.as_view(), name="user_data_export"),
    path("me/delete/", views.UserDeleteView.as_view(), name="user_delete"),
]
