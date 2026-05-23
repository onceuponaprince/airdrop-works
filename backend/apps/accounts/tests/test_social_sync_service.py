"""Tests for SocialSyncService (Phase 8 Discord channel crawl + scoring trigger)."""

from __future__ import annotations

from datetime import UTC, datetime
from unittest.mock import MagicMock, patch

import pytest
from django.contrib.auth import get_user_model

from apps.accounts.models import DiscordConnection
from apps.accounts.social_models import UserSocialAccount
from apps.accounts.social_sync_service import SocialSyncService
from apps.contributions.crawlers import CrawledItem, CrawlResult
from apps.contributions.models import Contribution

User = get_user_model()


@pytest.fixture
def sync_user(db):
    return User.objects.create_user(
        username="sync-me",
        wallet_address=f"0x{'b' * 38}01",
        email="sync@example.com",
    )


@pytest.mark.django_db
def test_includes_manual_social_accounts_in_synced_platforms(sync_user):
    UserSocialAccount.objects.create(
        user=sync_user,
        platform="github",
        external_id="gh_1",
        username="coder",
    )
    out = SocialSyncService.sync_user_accounts(sync_user)
    assert out["user_id"] == str(sync_user.id)
    assert "github" in out["synced_platforms"]
    assert len(out["synced_at"]) > 0


@pytest.mark.django_db
def test_discord_connected_without_tracked_channels_does_not_add_discord(sync_user):
    DiscordConnection.objects.create(
        user=sync_user,
        discord_user_id="7711",
        discord_username="solo",
        access_token="tok",
        metadata={"oauth": True},
    )
    with patch("apps.contributions.crawlers.crawl_discord") as crawl_mock:
        out = SocialSyncService.sync_user_accounts(sync_user)
    crawl_mock.assert_not_called()
    assert "discord" not in out["synced_platforms"]


@pytest.mark.django_db
def test_discord_tracked_channels_crawl_new_items_trigger_scoring(sync_user):
    DiscordConnection.objects.create(
        user=sync_user,
        discord_user_id="7712",
        discord_username="server",
        access_token="tok",
        metadata={"tracked_channels": ["ch_1"]},
    )
    crawl_return = CrawlResult(
        items=[
            CrawledItem(
                platform_content_id="msg_99",
                content_text="Build log day 7",
                content_url="https://discord.example/c/m/99",
                discovered_at=datetime.now(tz=UTC),
            )
        ]
    )

    mock_score = MagicMock()
    with (
        patch("apps.contributions.crawlers.crawl_discord", return_value=crawl_return),
        patch("apps.ai_core.workflow.run_scoring_pipeline", mock_score),
    ):
        out = SocialSyncService.sync_user_accounts(sync_user)

    assert "discord" in out["synced_platforms"]
    contrib = Contribution.objects.get(platform="discord", platform_content_id="msg_99")
    assert contrib.user_id == sync_user.id
    mock_score.assert_called_once_with(str(contrib.id))


@pytest.mark.django_db
def test_discord_duplicate_item_does_not_rescore(sync_user):
    DiscordConnection.objects.create(
        user=sync_user,
        discord_user_id="7713",
        discord_username="deduper",
        access_token="tok",
        metadata={"tracked_channels": ["ch_x"]},
    )
    Contribution.objects.create(
        user=sync_user,
        platform="discord",
        platform_content_id="dup_1",
        content_text="old",
        content_url="https://discord.example/old",
    )
    crawl_return = CrawlResult(
        items=[
            CrawledItem(
                platform_content_id="dup_1",
                content_text="duplicate body",
                content_url="https://discord.example/c/m/dup",
            )
        ]
    )
    mock_score = MagicMock()
    with (
        patch("apps.contributions.crawlers.crawl_discord", return_value=crawl_return),
        patch("apps.ai_core.workflow.run_scoring_pipeline", mock_score),
    ):
        SocialSyncService.sync_user_accounts(sync_user)

    mock_score.assert_not_called()


@pytest.mark.django_db
def test_discord_channel_crawl_exception_is_swallowed_per_channel(sync_user):
    DiscordConnection.objects.create(
        user=sync_user,
        discord_user_id="7714",
        discord_username="fragile",
        access_token="tok",
        metadata={"tracked_channels": ["bad_ch"]},
    )
    mock_score = MagicMock()
    with (
        patch("apps.contributions.crawlers.crawl_discord", side_effect=RuntimeError("rate limit")),
        patch("apps.ai_core.workflow.run_scoring_pipeline", mock_score),
    ):
        out = SocialSyncService.sync_user_accounts(sync_user)

    assert "discord" not in out["synced_platforms"]
    mock_score.assert_not_called()
