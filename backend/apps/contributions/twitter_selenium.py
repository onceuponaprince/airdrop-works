"""Optional Selenium fallback for tweet polling (dev / last resort only).

Prefer Twitter OAuth API polling in ``twitter_watch``. Enable with
``TWITTER_SELENIUM_WATCH_ENABLED=true`` and install optional deps:
``uv sync --extra selenium``.
"""

from __future__ import annotations

import logging
from datetime import UTC, datetime

from django.conf import settings

from .crawlers import CrawlResult, CrawledItem

logger = logging.getLogger(__name__)


def crawl_twitter_selenium(username: str, *, max_tweets: int = 10) -> CrawlResult:
    """Scrape recent tweets from the public profile timeline via headless Chrome."""
    if not getattr(settings, "TWITTER_SELENIUM_WATCH_ENABLED", False):
        raise ValueError("TWITTER_SELENIUM_WATCH_ENABLED is false")

    try:
        from selenium import webdriver
        from selenium.webdriver.chrome.options import Options
        from selenium.webdriver.common.by import By
        from selenium.webdriver.support.ui import WebDriverWait
    except ImportError as exc:
        raise ValueError(
            "Selenium not installed. Use API OAuth watch or: uv sync --extra selenium"
        ) from exc

    handle = username.lstrip("@").lower()
    options = Options()
    options.add_argument("--headless=new")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")

    driver = webdriver.Chrome(options=options)
    items: list[CrawledItem] = []
    try:
        driver.get(f"https://x.com/{handle}")
        WebDriverWait(driver, 15).until(
            lambda d: d.find_elements(By.CSS_SELECTOR, '[data-testid="tweetText"]')
        )
        nodes = driver.find_elements(By.CSS_SELECTOR, '[data-testid="tweetText"]')[:max_tweets]
        for idx, node in enumerate(nodes):
            text = (node.text or "").strip()
            if not text:
                continue
            pseudo_id = f"selenium-{handle}-{idx}-{hash(text) & 0xFFFFFFFF}"
            items.append(
                CrawledItem(
                    platform_content_id=pseudo_id,
                    content_text=text,
                    content_url=f"https://x.com/{handle}",
                    discovered_at=datetime.now(tz=UTC),
                    actor_handle=handle,
                    metadata={"ingestion": "selenium"},
                )
            )
    finally:
        driver.quit()

    logger.info("[TwitterSelenium] @%s fetched=%d", handle, len(items))
    return CrawlResult(items=items, next_cursor="")
