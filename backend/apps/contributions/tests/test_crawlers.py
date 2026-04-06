import json
from unittest.mock import patch

from django.test import SimpleTestCase, override_settings

from apps.contributions import crawlers


class FakeHTTPResponse:
    def __init__(self, payload):
        self.payload = payload

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False

    def read(self):
        return json.dumps(self.payload).encode("utf-8")


@override_settings(
    REDDIT_CLIENT_ID="reddit-client-id",
    REDDIT_CLIENT_SECRET="reddit-client-secret",
    REDDIT_USER_AGENT="airdrop-works-tests/1.0 by test-user",
    REDDIT_MAX_RESULTS=2,
)
class RedditCrawlerTests(SimpleTestCase):
    def tearDown(self):
        crawlers._REDDIT_TOKEN = ""
        crawlers._REDDIT_TOKEN_EXPIRES_AT = 0.0

    @patch("apps.contributions.crawlers.urlopen")
    def test_crawl_reddit_returns_items_and_cursor(self, urlopen_mock):
        urlopen_mock.side_effect = [
            FakeHTTPResponse({"access_token": "reddit-token", "expires_in": 3600}),
            FakeHTTPResponse(
                {
                    "data": {
                        "children": [
                            {
                                "data": {
                                    "name": "t3_newest",
                                    "id": "newest",
                                    "title": "Fresh alpha",
                                    "selftext": "Details here",
                                    "author": "Alice",
                                    "author_fullname": "t2_author",
                                    "created_utc": 1710000000,
                                    "permalink": "/r/python/comments/newest/fresh_alpha/",
                                    "url": "https://www.reddit.com/r/python/comments/newest/fresh_alpha/",
                                }
                            },
                            {
                                "data": {
                                    "name": "t3_second",
                                    "id": "second",
                                    "title": "Second post",
                                    "selftext": "",
                                    "author": "Bob",
                                    "author_fullname": "t2_author_two",
                                    "created_utc": 1710000100,
                                    "permalink": "/r/python/comments/second/second_post/",
                                    "url": "https://example.com/offsite",
                                }
                            },
                        ]
                    }
                }
            ),
        ]

        result = crawlers.crawl_reddit("r/Python")

        self.assertEqual(result.next_cursor, "t3_newest")
        self.assertEqual(len(result.items), 2)
        self.assertEqual(result.items[0].platform_content_id, "t3_newest")
        self.assertEqual(result.items[0].actor_handle, "alice")
        self.assertEqual(result.items[0].metadata["subreddit"], "python")
        self.assertIn("Fresh alpha", result.items[0].content_text)
        self.assertIn("Details here", result.items[0].content_text)

        listing_request = urlopen_mock.call_args_list[1].args[0]
        self.assertIn("/r/python/new?limit=2&raw_json=1", listing_request.full_url)
        self.assertEqual(listing_request.headers["Authorization"], "Bearer reddit-token")

    @patch("apps.contributions.crawlers.urlopen")
    def test_crawl_reddit_uses_before_cursor_for_incremental_fetches(self, urlopen_mock):
        urlopen_mock.side_effect = [
            FakeHTTPResponse({"access_token": "reddit-token", "expires_in": 3600}),
            FakeHTTPResponse({"data": {"children": []}}),
        ]

        result = crawlers.crawl_reddit("python", before_fullname="t3_cursor")

        self.assertEqual(result.items, [])
        listing_request = urlopen_mock.call_args_list[1].args[0]
        self.assertIn("before=t3_cursor", listing_request.full_url)


class TwitterCrawlerTests(SimpleTestCase):
    @override_settings(TWITTER_BEARER_TOKEN="abc%2B123%2Fxyz%3D")
    def test_twitter_bearer_token_is_url_decoded(self):
        self.assertEqual(crawlers._twitter_bearer_token(), "abc+123/xyz=")
