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
        Sync all connected social accounts for a user.

        Currently a stub that logs intent. Real implementation will:
        - Call crawl_discord / crawl_telegram / twitter crawler
        - Run AI Judge scoring
        - Award XP via existing workflow
        """
        from apps.accounts.social_models import UserSocialAccount

        accounts = UserSocialAccount.objects.filter(user=user)

        synced = []
        for account in accounts:
            logger.info(
                "[SocialSync] Syncing %s account for user %s",
                account.platform,
                user.wallet_address[:6],
            )
            # TODO: Implement actual crawl + score logic per platform
            synced.append(account.platform)

        return {
            "user_id": str(user.id),
            "synced_platforms": synced,
            "synced_at": timezone.now().isoformat(),
        }