# Twitter OAuth watch + live feed

## Overview

Users can **link or log in with X (Twitter)** via OAuth 2.0 PKCE. Linked accounts are polled on a schedule; new tweets are ingested as `Contribution` rows with **lexicon sentiment** in `dimension_explanations.sentiment`. Clients receive **`tweet.ingested`** events over a WebSocket.

**Default path:** Twitter API v2 user timeline (OAuth user context).  
**Optional:** Selenium scrape when `TWITTER_SELENIUM_WATCH_ENABLED=true` and connection has `use_selenium_fallback` (dev only).

## Setup

1. [X Developer Portal](https://developer.twitter.com/) — create app with OAuth 2.0.
2. Callback URL: `http://localhost:8001/api/v1/auth/twitter/callback/` (must match `.env`).
3. Scopes: `tweet.read`, `users.read`, `offline.access`.
4. `.env`:

```bash
TWITTER_CLIENT_ID=...
TWITTER_CLIENT_SECRET=...
TWITTER_OAUTH_CALLBACK_URL=http://localhost:8001/api/v1/auth/twitter/callback/
SITE_URL=http://localhost:8001
FRONTEND_URL=http://localhost:3000
```

5. Run backend with ASGI (Docker compose uses `daphne`):

```bash
docker compose up -d backend redis celery-worker celery-beat
```

## API

| Method | Path | Auth |
|--------|------|------|
| GET | `/api/v1/auth/twitter/start/?mode=link\|login` | link: JWT; login: public |
| GET | `/api/v1/auth/twitter/callback/` | OAuth redirect |
| GET/PATCH/DELETE | `/api/v1/auth/twitter/me/` | JWT |
| POST | `/api/v1/auth/twitter/sync/` | JWT |

## WebSocket

`ws://localhost:8001/ws/twitter/feed/?token=<access_jwt>`

Events:

```json
{ "type": "tweet.ingested", "contributionId": "...", "text": "...", "sentiment": { "label": "positive", "score": 0.42 } }
```

## UI

**Sources** (`/sources`) — “Watch your X account” panel: link, sync, live feed.

## Selenium (optional)

```bash
cd backend && uv sync --extra selenium
# .env: TWITTER_SELENIUM_WATCH_ENABLED=true
# Requires Chrome/Chromium on the host or in the image
```

Not recommended for production — brittle and may violate X ToS.
