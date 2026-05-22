from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from . import views
from . import twitter_views
from .social_views import (
    ConnectSocialAccountView,
    DisconnectSocialAccountView,
    MySocialAccountsView,
    SyncSocialAccountsView,
)

urlpatterns = [
    path("wallet-verify/", views.WalletVerifyView.as_view(), name="wallet_verify"),
    path("twitter/start/", twitter_views.TwitterOAuthStartView.as_view(), name="twitter_oauth_start"),
    path("twitter/callback/", twitter_views.TwitterOAuthCallbackView.as_view(), name="twitter_oauth_callback"),
    path("twitter/me/", twitter_views.TwitterConnectionStatusView.as_view(), name="twitter_connection"),
    path("twitter/sync/", twitter_views.TwitterSyncNowView.as_view(), name="twitter_sync_now"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("me/", views.UserProfileView.as_view(), name="user_profile"),
    path("me/export/", views.UserDataExportView.as_view(), name="user_data_export"),
    path("me/delete/", views.UserDeleteView.as_view(), name="user_delete"),

    # Multi-platform social connections (Telegram, Discord, Twitter, etc.)
    path("social/connect/", ConnectSocialAccountView.as_view(), name="social_connect"),
    path("social/disconnect/", DisconnectSocialAccountView.as_view(), name="social_disconnect"),
    path("social/me/", MySocialAccountsView.as_view(), name="social_me"),
    path("social/sync/", SyncSocialAccountsView.as_view(), name="social_sync"),
]
