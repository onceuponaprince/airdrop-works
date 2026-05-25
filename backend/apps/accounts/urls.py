from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from . import views
from . import twitter_views
from . import discord_views
from . import telegram_views
from .social_views import (
    ConnectSocialAccountView,
    DisconnectSocialAccountView,
    MySocialAccountsView,
    SyncSocialAccountsView,
)

urlpatterns = [
    path("wallet-verify/", views.WalletVerifyView.as_view(), name="wallet_verify"),
    path("email/verify/", views.EmailVerifyView.as_view(), name="email_verify"),
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

    # Discord OAuth
    path("discord/start/", discord_views.DiscordOAuthStartView.as_view(), name="discord_oauth_start"),
    path("discord/callback/", discord_views.DiscordOAuthCallbackView.as_view(), name="discord_oauth_callback"),
    path("discord/channels/", discord_views.UpdateDiscordChannelsView.as_view(), name="discord_update_channels"),

    # Telegram deep link + linking (called by bot) + production webhook receiver
    path("telegram/start/", telegram_views.TelegramDeepLinkView.as_view(), name="telegram_deep_link"),
    path("telegram/link/", telegram_views.TelegramLinkView.as_view(), name="telegram_link"),
    path("telegram/webhook/", telegram_views.TelegramWebhookView.as_view(), name="telegram_webhook"),
]
