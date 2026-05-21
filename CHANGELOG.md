# Changelog

All notable changes to this repository will be documented in this file.

## Unreleased

### Added

### Changed

### Fixed

### Chore

## 0.3.2 - 2026-05-21

### Added
- `scripts/verify_phase2_gate.sh` and `scripts/phase2_pilot_smoke.sh` for Phase 2 close-out.
- `docs/PHASE_2_COMPLETE.md` summary.

### Changed
- CI backend job runs integrity, contributions, rewards, and ai_core test slice.
- Default smoke scripts use `http://localhost:8001` (Docker compose port).

### Fixed
- `payout_batch` management command tests use `django_db` and approval fixtures.

### Chore
- Phase 2 verification checklist signed off; bumped monorepo to `0.3.2`.

## 0.3.1 - 2026-05-21

### Added
- `JUDGE_HEURISTIC_FALLBACK_ENABLED` flag (off in production; on in local dev).
- Wallet auth/connect analytics events and loot gas confirmation dialog (`NEXT_PUBLIC_GAS_CONFIRM_THRESHOLD_USD`).
- Grafana Phase 2 panel spec (`docs/ops/grafana-phase2-panels.md`).

### Changed
- Login errors show retry + reconnect actions; loot chests use primary **Claim loot** CTA.
- Judge runbook documents heuristic flag and `judge` Celery queue.

### Chore
- Bumped monorepo package versions to `0.3.1`.

## 0.3.0 - 2026-05-21

### Added
- `GET /api/v1/integrity/{wallet}/` public reputation bundle and staff `GET /api/v1/integrity/export/` (JSON/CSV).
- Payout idempotency keys on `AirdropPayoutApproval` and `rewards.execute_payout_approval` no-op Celery task (`onchain-executor` queue).
- `judge` Celery queue route for `ai_core.score_contribution`.
- Phase 2 parallel execution plan, verification checklist, prep doc, and `verify_phase2_endpoints.sh`.

### Changed
- Crawl failures truncate `last_error`, update metadata, and use Celery retry.
- `payout_batch --dry-run` prints approval idempotency keys.

### Chore
- Bumped monorepo package versions to `0.3.0`.

## 0.2.5 - 2026-05-21

### Added
- SIWE wallet login (`useWalletLogin`, `siwe.ts`) and JWT session validation via `AuthGuard` + `WalletSessionSync`.
- Platform judge persistence: authenticated `POST /judge/score/` upserts `Contribution` rows and awards XP for dashboard history.
- `docs/PLATFORM_READY.md` and `scripts/bootstrap_platform.sh` for Docker-based app bootstrap.

### Changed
- App judge, dashboard, quests, and leaderboard call Django APIs with `unwrapList` / camelCase contribution fields.
- `useAiJudge({ platform: true })` uses `/api/v1/judge/score/` instead of the marketing NDJSON stream.

### Fixed
- `AdminOverviewView` stats aggregation (camelCase admin metrics).
- Login page dev-bypass loading state; contribution list pagination on dashboard.

### Chore
- Bumped monorepo package versions to `0.2.5`.

## 0.2.4 - 2026-05-21

### Added
- Phase 1 admin surface: cached `GET /api/v1/admin/stats/`, contribution admin list/detail, and spec URL aliases.
- Quest-linked scoring rubrics (`ScoringRubric.quest` FK) with expanded rubric API and tests.
- Frontend `CampaignRubricForm`, percent-weight rubric UI, wallet error reporting, and `useAiJudge` spec-shaped streaming state.
- Phase 1 verification checklist, execution plan, and `scripts/verify_phase1_endpoints.sh`.

### Changed
- Admin campaign filters accept `ended` status alias; campaign titles must be unique.
- Contribution admin serializer exposes wallet address and score breakdown only.

### Chore
- Bumped monorepo package versions to `0.2.4`.

## 0.2.3 - 2026-05-21

### Added
- Figma variable collection spec (`docs/figma-variables.md`) for landing refresh and marketing↔app parity.
- Cursor Figma MCP design system rules (`.cursor/rules/figma-design-system.mdc`).

### Changed
- `CLAUDE.md` links designers and implementers to the Figma handoff docs.

### Chore
- Bumped monorepo package versions to `0.2.3`.

## 0.2.2 - 2026-05-21

### Added
- Deterministic Playwright journey suite (mock-first, no backend dependency).

### Changed
- Landing page funnel: simplified hero CTA and moved trust + waitlist earlier.

### Fixed
- Rate-limited waitlist email check endpoint to reduce enumeration abuse.

### Chore
- CI now runs Playwright journeys.

## 0.2.1 - 2026-05-21

### Added
- Added reward-system campaign payout and connector API hardening for release readiness.

### Changed
- Bumped monorepo package versions (root, frontend, contracts, and backend metadata) from `0.2.0` to `0.2.1` to keep release artifacts aligned.

### Chore
- Updated changelog for this release boundary and upcoming merge ship handoff.

---

This changelog was generated automatically from recent merge commits on `main`.
