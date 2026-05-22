# Phase 8 — Campaign Expansion & Hardening (Post 0.8.1)

**Goal:** Turn the current multi-platform contribution scoring system into a polished, user-friendly live campaign that feels production-ready.

**Scope:** All items requested on 2026-05-22

---

## Current Foundation (Already Shipped)

- UserSocialAccount + dedicated Twitter/Discord/Telegram connections (full models)
- Real OAuth for Twitter + full Discord (exchange, persist dedicated + generic record, redirects)
- Secure deep-link Telegram connection flow (token-based)
- SocialSyncService + Celery auto-sync every 10 min (Discord channel-aware)
- Real Discord message crawling + AI Judge scoring (per tracked channels in metadata)
- Users can configure tracked Discord channel IDs via UI (saved to DiscordConnection.metadata)
- Multi-platform aggregated leaderboard
- Polished SocialAccountsPanel with freshness indicators + inline Discord channel config
- Dedicated `/campaign` marketing + leaderboard page + sidebar nav

---

## Planned Waves (Atomic, Prioritized)

### Wave 4 — Campaign Surface & Visibility (High Impact)
- Dedicated `/campaign` marketing + leaderboard page
- "Join the Campaign" CTAs across dashboard, sources, and marketing site
- First-connect micro-rewards + progress tracking

### Wave 5 — User Control & Polish
- [x] Allow users to configure which Discord channels they want tracked (full OAuth + config UI + sync integration)
- Telegram bot production hardening (webhook, proper payload validation, rate limiting)
- Better error states and connection health indicators

### Wave 6 — Platform Expansion
- GitHub (commits + PRs + issues from connected account)
- Reddit (personal posts + comments)
- Optional: YouTube / TikTok later

### Wave 7 — Hardening & Ops (Return to Backlog)
- Full test coverage for new flows
- Rate limiting, deduping, and retry logic for social sync
- Admin tools for bulk re-scoring / manual triggers
- Documentation + ops runbooks
- Refactoring for reusability (as requested)

---

## Success Metrics (for this round)

- Users can connect 2+ platforms with < 3 clicks
- Scoring happens automatically within 15 minutes of activity
- Clear visibility into "when was I last scored?"
- Campaign page becomes the default destination for new users

---

**Status:** Wave 4 + first Wave 5 item complete (Campaign page + Discord channel config + full real Discord OAuth). Next: production Telegram bot or GitHub/Reddit expansion.
