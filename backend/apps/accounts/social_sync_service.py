"""
Social Sync Service — unified logic for syncing activity from connected social accounts
and running it through the AI Judge scoring pipeline.
"""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING

from django.utils import timezone

if TYPE_CHECKING:
    from apps.accounts.models import User

logger = logging.getLogger(__name__)


class SocialSyncService:
    """
    Service responsible for syncing a user's connected social accounts
    and triggering scoring.
    """

    @staticmethod
    def sync_user_accounts(user: User) -> dict:
        """
        Sync all connected social accounts for a user and trigger scoring.
        """
        from apps.accounts.social_models import UserSocialAccount
        from apps.accounts.models import DiscordConnection

        synced = []

        # Generic social accounts
        for account in UserSocialAccount.objects.filter(user=user):
            logger.info("[SocialSync] Syncing %s for user %s", account.platform, user.wallet_address[:6])
            synced.append(account.platform)

        # Dedicated Discord connection
        if DiscordConnection.objects.filter(user=user).exists():
            logger.info("[SocialSync] Discord connection found for user %s", user.wallet_address[:6])
            synced.append("discord")

        # TODO: Call crawl_discord + AI Judge + award XP here

        return {
            "user_id": str(user.id),
            "synced_platforms": list(set(synced)),
            "synced_at": timezone.now().isoformat(),
        }