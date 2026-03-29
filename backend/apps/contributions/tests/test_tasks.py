from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.test import TestCase

from apps.contributions.crawlers import CrawledItem, CrawlResult
from apps.contributions.models import Contribution, CrawlSourceConfig
from apps.contributions.tasks import crawl_source_config_task


class CrawlSourceConfigTaskTests(TestCase):
    def setUp(self):
        user_model = get_user_model()
        self.user = user_model.objects.create(
            username="reddit-task-user",
            wallet_address="0xfeedfeedfeedfeedfeedfeedfeedfeedfeedfeed",
            is_active=True,
        )

    @patch("apps.contributions.tasks.score_contribution_task.delay")
    @patch("apps.contributions.tasks.record_reddit_item")
    @patch("apps.contributions.tasks.crawl_reddit")
    def test_reddit_source_config_persists_items_and_updates_cursor(
        self,
        crawl_reddit_mock,
        record_reddit_item_mock,
        score_delay_mock,
    ):
        source = CrawlSourceConfig.objects.create(
            user=self.user,
            platform="reddit",
            source_key="python",
            is_active=True,
        )
        crawl_reddit_mock.return_value = CrawlResult(
            items=[
                CrawledItem(
                    platform_content_id="t3_newest",
                    content_text="Fresh alpha\n\nDetails here",
                    content_url="https://www.reddit.com/r/python/comments/newest/fresh_alpha/",
                    actor_id="t2_author",
                    actor_handle="alice",
                    metadata={"subreddit": "python", "title": "Fresh alpha"},
                )
            ],
            next_cursor="t3_newest",
        )

        result = crawl_source_config_task.run(source_config_id=str(source.id))

        self.assertEqual(result["status"], "ok")
        self.assertEqual(result["created"], 1)
        self.assertEqual(result["fetched"], 1)

        source.refresh_from_db()
        self.assertEqual(source.cursor, "t3_newest")
        self.assertEqual(source.metadata["last_status"], "ok")
        self.assertEqual(source.metadata["last_fetched_count"], 1)
        self.assertEqual(source.metadata["last_created_count"], 1)

        contribution = Contribution.objects.get(platform="reddit", platform_content_id="t3_newest")
        self.assertEqual(contribution.user, self.user)
        self.assertEqual(contribution.dimension_explanations["spore_author"], "alice")
        self.assertEqual(contribution.dimension_explanations["spore_subreddit"], "python")

        crawl_reddit_mock.assert_called_once_with(subreddit="python", before_fullname=None)
        record_reddit_item_mock.assert_called_once()
        score_delay_mock.assert_called_once()
