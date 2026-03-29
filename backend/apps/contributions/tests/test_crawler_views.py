from types import SimpleNamespace
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APITestCase

from apps.contributions.models import CrawlSourceConfig


class CrawlerTriggerViewsTests(APITestCase):
    def setUp(self):
        user_model = get_user_model()
        self.user = user_model.objects.create(
            username="crawler-tester",
            wallet_address="0x1234567890abcdef1234567890abcdef12345678",
            is_active=True,
        )
        self.client.force_authenticate(user=self.user)

    @patch("apps.contributions.views.crawl_source_config_task.delay")
    def test_crawl_twitter_queue(self, delay_mock):
        delay_mock.return_value = SimpleNamespace(id="task-twitter-1")

        response = self.client.post(
            reverse("crawl_twitter"),
            {"username": "airdropworks"},
            format="json",
        )

        self.assertEqual(response.status_code, 202)
        self.assertEqual(response.data["status"], "queued")
        self.assertTrue(
            CrawlSourceConfig.objects.filter(
                user=self.user,
                platform="twitter",
                source_key="airdropworks",
                is_active=True,
            ).exists()
        )
        delay_mock.assert_called_once()

    @patch("apps.contributions.views.crawl_source_config_task.delay")
    def test_crawl_discord_queue(self, delay_mock):
        delay_mock.return_value = SimpleNamespace(id="task-discord-1")

        response = self.client.post(
            reverse("crawl_discord"),
            {"channel_id": "123456789012345678"},
            format="json",
        )

        self.assertEqual(response.status_code, 202)
        self.assertEqual(response.data["status"], "queued")
        delay_mock.assert_called_once()

    @patch("apps.contributions.views.crawl_source_config_task.delay")
    def test_crawl_reddit_queue(self, delay_mock):
        delay_mock.return_value = SimpleNamespace(id="task-reddit-1")

        response = self.client.post(
            reverse("crawl_reddit"),
            {"subreddit": "r/Python"},
            format="json",
        )

        self.assertEqual(response.status_code, 202)
        self.assertEqual(response.data["status"], "queued")
        self.assertTrue(
            CrawlSourceConfig.objects.filter(
                user=self.user,
                platform="reddit",
                source_key="python",
                is_active=True,
            ).exists()
        )
        delay_mock.assert_called_once()

    @patch("apps.contributions.views.crawl_source_config_task.delay")
    def test_crawl_telegram_queue(self, delay_mock):
        delay_mock.return_value = SimpleNamespace(id="task-telegram-1")

        response = self.client.post(
            reverse("crawl_telegram"),
            {"chat_id": "-1001234567890"},
            format="json",
        )

        self.assertEqual(response.status_code, 202)
        self.assertEqual(response.data["status"], "queued")
        delay_mock.assert_called_once()

    @patch("apps.contributions.views.crawl_all_active_sources_task.delay")
    def test_crawl_all_queue(self, delay_mock):
        delay_mock.return_value = SimpleNamespace(id="task-all-1")

        response = self.client.post(reverse("crawl_all_platforms"), {}, format="json")

        self.assertEqual(response.status_code, 202)
        self.assertEqual(response.data["status"], "queued")
        delay_mock.assert_called_once()


class CrawlSourceConfigCrudTests(APITestCase):
    def setUp(self):
        user_model = get_user_model()
        self.user = user_model.objects.create(
            username="source-config-user",
            wallet_address="0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
            is_active=True,
        )
        self.client.force_authenticate(user=self.user)

    def test_list_create_update_source_config(self):
        create_response = self.client.post(
            reverse("crawl_source_list_create"),
            {
                "platform": "twitter",
                "source_key": "airdropworks",
                "is_active": True,
            },
            format="json",
        )

        self.assertEqual(create_response.status_code, 201)
        source_id = create_response.data["id"]

        list_response = self.client.get(reverse("crawl_source_list_create"))
        self.assertEqual(list_response.status_code, 200)
        results = list_response.data.get("results", list_response.data)
        self.assertEqual(len(results), 1)

        patch_response = self.client.patch(
            reverse("crawl_source_detail", kwargs={"pk": source_id}),
            {"is_active": False},
            format="json",
        )
        self.assertEqual(patch_response.status_code, 200)
        self.assertFalse(patch_response.data["is_active"])
