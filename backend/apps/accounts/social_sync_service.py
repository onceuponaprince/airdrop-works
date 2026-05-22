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
        Sync connected social accounts and run AI Judge scoring on recent activity.
        """
        from apps.accounts.social_models import UserSocialAccount
        from apps.accounts.models import DiscordConnection
        from apps.contributions.crawlers import crawl_discord
        from apps.contributions.models import Contribution
        from apps.ai_core.workflow import run_scoring_pipeline

        synced_platforms: set[str] = set()

        # 1. Generic social accounts (manual entry for now)
        for account in UserSocialAccount.objects.filter(user=user):
            logger.info("[SocialSync] Generic sync for %s (user=%s)", account.platform, user.wallet_address[:6])
            synced_platforms.add(account.platform)

        # 2. Real Discord crawling + scoring
        discord_conn = DiscordConnection.objects.filter(user=user).first()
        if discord_conn:
            tracked_channels = discord_conn.metadata.get("tracked_channels", []) if discord_conn.metadata else []

            if tracked_channels:
                for channel_id in tracked_channels[:3]:  # limit to first 3 channels
                    try:
                        result = crawl_discord(channel_id=channel_id)
                        for item in result.items:
                            contribution, created = Contribution.objects.get_or_create(
                                user=user,
                                platform="discord",
                                content_url=item.content_url,
                                defaults={
                                    "content_text": item.content_text[:4000],
                                    "discovered_at": item.discovered_at or timezone.now(),
                                },
                            )
                            if created:
                                run_scoring_pipeline(str(contribution.id))
                                logger.info("[SocialSync] Scored new Discord message for user %s", user.wallet_address[:6])

                        synced_platforms.add("discord")
                    except Exception as exc:
                        logger.warning("[SocialSync] Discord crawl failed for channel %s: %s", channel_id, exc)
            else:
                logger.info("[SocialSync] Discord connected but no tracked channels configured yet")

        return {
            "user_id": str(user.id),
            "synced_platforms": sorted(synced_platforms),
            "synced_at": timezone.now().isoformat(),
        }