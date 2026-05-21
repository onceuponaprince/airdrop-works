# Phase 1 Parallel Execution — Implementation Plan

> **For agentic workers:** Execute wave-by-wave; one commit per service after tests pass.

**Goal:** Complete Phase 1 functions 1–9 per hybrid contract (extend existing APIs, add admin stats, quest-linked rubrics).

**Architecture:** Nine logical services across 4 waves; parallel lanes per wave with merge gates.

**Tech stack:** Next.js 14, Django 5, DRF, PostgreSQL, Particle ConnectKit, NDJSON judge stream.

---

## Wave 0 — Contract freeze

- [x] `docs/PHASE_1_VERIFICATION.md` API contract
- [x] `ScoringRubric.quest` FK migration `0002_scoringrubric_quest`
- [x] Rubric weights remain 0.0–1.0 in API; UI uses percent conversion

## Wave 1 — Foundations

### walletSvc
- [x] Wire `handleWalletError` + fallback metadata in `ParticleProvider.tsx`
- [x] `reportWalletError` on wallet context

### rubricSvc
- [x] `questId` / `campaignId` on rubric serializer
- [x] `backend/apps/judge/tests/test_rubric.py`

### campaignSvc
- [x] `ended` status alias, unique title validation
- [x] `backend/apps/quests/tests/test_admin_campaigns_extended.py`

**Gate:** `pytest apps/judge apps/quests`

## Wave 2 — Admin surface

### contribAdmin
- [x] `AdminContributionDetailView`, filters, wallet-only serializer
- [x] `backend/apps/contributions/tests/test_admin.py`

### adminAnalytics
- [x] `apps.admin` + `GET /api/v1/admin/stats/`
- [x] `backend/apps/admin/tests/test_stats.py`

### rubricUi
- [x] `CampaignRubricForm.tsx` wrapper
- [x] `RubricForm` campaign picker + percent weights + PUT

**Gate:** `pytest apps/contributions apps/admin`

## Wave 3 — UX, perf, verification

### judgeStream
- [x] `useAiJudge(onScoreUpdate?)` + `isLoading`/`scores`/`totalScore`/`isFarming`

### leaderboardSvc
- [x] `test_leaderboard.py` query count regression

### verifySvc
- [x] `scripts/verify_phase1_endpoints.sh`
- [x] `docs/PHASE_1_VERIFICATION.md` checklist

**Final gate:** `pnpm lint`, `pnpm build`, `pytest`, `docker compose up`
