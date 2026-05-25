# Phase 8 Hardening Backlog — Live Multi-Platform Campaign (Post 0.8.1)

**Goal:** Make the newly shipped social connection + real-time scoring system (Twitter OAuth, Discord OAuth + channel config, Telegram deep-link + production webhook, SocialSyncService, aggregated leaderboard) production-grade, observable, and safe before broader expansion (GitHub/Reddit in Wave 6).

**Priority:** User chose **2 > 1** (Hardening first, then platform expansion).

**Status:** Hardening round started (2026-05-22 evening).

---

## P0 — Security & Abuse Prevention (Do First)

- [x] Add DRF ScopedRateThrottle to public `TelegramWebhookView` (`telegram_webhook` scope) + `TelegramLinkView` + authenticated social endpoints (see `DEFAULT_THROTTLE_RATES` in `base.py`)
- [x] **Dev fix:** `config.settings.local` now **merges** onto `base` throttle rates instead of replacing the dict (previously dropped all non-listed scopes and broke Discord channel updates in pytest / local).
- [x] Document the new required env vars + exact setWebhook curl in a new "Live Campaign / Social Connections (Phase 8)" subsection of DEPLOYMENT.md (commit 325be71)

## P1 — Test Coverage (Confidence & Regression Safety)

- [x] Backend: pytest coverage for `TelegramWebhookView` (linked user, unlinked, dup delivery, wrong/missing secret when configured, channel_post + caption-only, bare updates → no-op; scoring enqueue) — `apps/accounts/tests/test_campaign_social_views.py`
- [x] Backend: tests for `UpdateDiscordChannelsView` + metadata persistence/merge (`oauth`/`guild_id` preserved) — same module
- [x] Backend: tests for `SocialSyncService.sync_user_accounts` — `apps/accounts/tests/test_social_sync_service.py` (Discord channel path mocked, duplicates, crawl errors)
- [x] Backend: tests for `MultiPlatformLeaderboardView` — `apps/leaderboard/tests/test_multi_platform_leaderboard.py`
- [x] Frontend: Playwright E2E — Discord channel save + mocked connected row/fresh sync line; Telegram deep-link from dashboard with `window.open` stub + mocked `/auth/telegram/start/` (`tests/e2e/journeys/social-connections.spec.ts`). Shared mocks extended in `tests/e2e/helpers/mockApi.ts`.
- [x] Frontend: Playwright **`/sources` Twitter panel** (`tests/e2e/journeys/twitter-watch.spec.ts`) — disconnected + connected UI via `twitterMe` mock; verifies **Sync now** → `POST /auth/twitter/sync/` and **Watch enabled** checkbox → `PATCH /auth/twitter/me/` (`mockApi` merges PATCH into `twitterMe` state).
- [x] Frontend: Playwright **`/sources` crawl form** (`tests/e2e/journeys/crawl-sources.spec.ts`) — empty crawl list shell; Reddit / Discord **`POST /contributions/crawl/<platform>/`** payloads; surfaced card + **`PATCH` pause** + **`POST .../sources/<id>/crawl/`** (“Run now”). `mockApi` fixes contributions routing so crawl endpoints are not swallowed by the list mock; adds **`GET /leaderboard/multi-platform/`** stub.
- [x] Wired social/campaign test modules into `.github/workflows/ci.yml` Phase 2 slice (incl. `test_my_social_accounts.py`)

## P2 — Observability & Health

- [x] Expose **`last_error`** on OAuth-backed rows in `MySocialAccountsView` + show in `SocialAccountsPanel` (truncated + title tooltip); manual `UserSocialAccount` rows unchanged. Tests: `test_my_social_accounts.py`.

- [ ] Add a simple “Last webhook ping” or “Last successful ingest” timestamp on `TelegramConnection`
- [ ] Celery task failure handling + alerting hooks for social sync / scoring jobs (or at least good logging + dead-letter patterns)
- [ ] Admin dashboard visibility (already added Discord/TelegramConnection admins — enhance with “Trigger resync” action)

## P3 — Ops & Admin Tooling

- [ ] Management command or staff-only API: `rescore_social_contributions --user <wallet>` or bulk for a platform
- [ ] One-click “Re-link / Repair” flows in UI for errored connections (clear tokens + restart OAuth)
- [ ] Runbook: “How to onboard a new campaign participant’s Telegram/Discord in production” + “How to rotate webhook secret”
- [ ] Monitoring: suggested Grafana / Sentry queries or log filters for the new endpoints

## P4 — Code Quality & Reusability (User-Requested Refactor)

- [ ] Extract common OAuth “start + cache state + callback + redirect” pattern (Twitter and Discord implementations are very similar)
- [ ] Create a small `social/` utils package or base classes for connection models (shared `last_synced`, `last_error`, `metadata` handling)
- [ ] Make `DiscordChannelConfig` component and similar UI pieces reusable (already somewhat isolated)
- [ ] Review duplication between `social_views.py` (generic) and dedicated platform views; consider a thin adapter layer

## P5 — Edge Cases & Resilience

- [ ] Webhook: handle edited messages, deleted messages, pinned, etc. gracefully (ignore or update existing Contribution if needed)
- [ ] Dedup robustness when `platform_content_id` format changes across Telegram chat types
- [ ] Rate-limit + backoff on the outbound crawlers (Discord API, Telegram getUpdates if polling fallback is used)
- [ ] Handle token expiry / refresh for Discord (long-lived bot tokens are different from user OAuth; current flow stores user token)

## Success Criteria for “Hardening Round Complete”

- All P0/P1 items green
- New social flows have ≥80% branch coverage in backend tests
- A malicious actor cannot trivially DoS the webhook or spam scoring jobs
- An operator can diagnose “why isn’t this user’s Telegram posts scoring?” in < 2 minutes using admin + logs
- No obvious code duplication left in the OAuth layer

---

## Execution Notes

- Work in small atomic commits (feature/hardening/* branches if collaborating).
- Update this file + `PHASE_8_CAMPAIGN_EXPANSION_PLAN.md` after each slice.
- After hardening round, resume Wave 6 (GitHub + Reddit personal feeds).

**Current focus (as of 2026-05-23):** P2 observability (`TelegramConnection` ingest ping, Celery/alerting hooks) ahead of Wave 6.

Next after hardening: GitHub/Reddit expansion (user priority).
