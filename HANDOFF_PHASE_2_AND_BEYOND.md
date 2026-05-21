# airdrop-works Phase 2 and Beyond Handoff

**Date:** 2026-05-11 (legacy) · **Updated plan:** 2026-05-21  
**Scope:** Phase 2 implementation status, validation results, and the cleanest path into the next workstream

> **Start here for new work:** [`docs/superpowers/plans/2026-05-21-phase-2-parallel-execution.md`](docs/superpowers/plans/2026-05-21-phase-2-parallel-execution.md) and [`docs/PHASE_2_PREP.md`](docs/PHASE_2_PREP.md) (post–0.2.5 platform-ready baseline).

## Executive Summary

Phase 1 is complete and merged, and Phase 2 is now partially implemented. The current repo state includes deterministic CI, judge integration coverage, serializer contract fixes, and judge cost controls with heuristic fallback scoring. The next person picking this up should treat the remaining work as launch-hardening: telemetry, leaderboard operations, onchain reward plumbing, and production readiness.

## What Has Shipped

### CI and backend validation

- Rewrote [`.github/workflows/ci.yml`](.github/workflows/ci.yml) to remove malformed duplicate jobs and make backend validation deterministic.
- Backend CI now runs `uv sync --frozen --extra dev`, migrations, and a coverage-gated pytest slice for `apps/quests/tests` and `apps/judge/tests`.
- Frontend CI remains on `pnpm install --frozen-lockfile` and `pnpm build` with Node 20 and pnpm 10.

### Judge cost controls

- Added a heuristic fallback scorer in [`backend/apps/ai_core/heuristics.py`](backend/apps/ai_core/heuristics.py).
- Updated [`backend/apps/ai_core/service.py`](backend/apps/ai_core/service.py) so Anthropic failures, missing API keys, parsing failures, and rate-limit style failures fall back to heuristic scoring instead of hard failing.
- Added authenticated throttling for judge scoring in [`backend/apps/judge/views.py`](backend/apps/judge/views.py).
- Applied the same throttle to both single-text scoring and account-scoring endpoints.
- Added throttle rates in [`backend/config/settings/base.py`](backend/config/settings/base.py) and [`backend/config/settings/local.py`](backend/config/settings/local.py).

### Judge and quest API correctness

- Fixed rubric detail routing from `<int:pk>` to `<uuid:pk>` in [`backend/apps/judge/urls.py`](backend/apps/judge/urls.py).
- Fixed admin campaign serializer field mapping in [`backend/apps/quests/serializers.py`](backend/apps/quests/serializers.py) so camelCase payloads map cleanly to snake_case model fields.
- Updated quest tests to use named routes and camelCase request bodies in [`backend/apps/quests/tests/test_admin_campaigns.py`](backend/apps/quests/tests/test_admin_campaigns.py) and [`backend/apps/quests/tests/test_admin_campaigns_authenticated.py`](backend/apps/quests/tests/test_admin_campaigns_authenticated.py).

### Test coverage added

- Added judge endpoint tests in [`backend/apps/judge/tests/test_views.py`](backend/apps/judge/tests/test_views.py) covering:
  - demo scoring
  - authenticated scoring with credits
  - free fallback when credits are exhausted
  - authenticated throttling for single scoring
  - authenticated throttling for account scoring
  - rubric public list + admin create/detail
- Added AI core fallback test in [`backend/apps/ai_core/tests/test_service.py`](backend/apps/ai_core/tests/test_service.py).

## Current Behavior

### Judge scoring

- Demo scoring is public and throttled.
- Authenticated single-text scoring is credit-gated and throttled at `10/hour`.
- Account scoring is also throttled at `10/hour`.
- If credits are exhausted, the user now gets free heuristic scoring instead of a hard stop.
- If Anthropic is unavailable or returns a parsing/auth/rate-limit style failure, the AI core service falls back to the heuristic scorer.

### Heuristic fallback shape

- Returns the same score contract as the LLM-backed scorer.
- Uses simple lexical and keyword heuristics.
- Sets `composite_score = 50 + randomness` with clamping.
- Keeps output stable enough for UI consumption while clearly not pretending to be a full model result.

## Validation

### What passed

- `git diff --check`
- Focused backend validation for judge and quest slices
- Final backend test run: `9 passed`

### Validation caveat

- The local scratch `uv run` environment used during validation did not reliably carry Django dependencies at the system level, so the working path for verification was the repo-managed temp environment plus SQLite fallback.
- Postgres auth in the local container was not usable for ad hoc validation, so tests were exercised against SQLite where needed.

## What Still Needs Attention

### Phase 2 remaining work

1. Leaderboard operations
   - Add/verify runbook coverage for the Celery rebuild task.
   - Decide whether incremental rebuild hooks are needed before launch.

2. Onchain reward pipeline
   - Draft the payout batch skeleton in dry-run mode.
   - Add admin approval flow before any real transfers.
   - Wire the token ABI and gas estimation only when the flow is approved.

3. UX and wallet polish
   - Finalize wallet error messaging and recovery flows.
   - Finish QA on fallback connectors and login edge cases.

4. Telemetry and release readiness
   - Add Sentry or equivalent monitoring.
   - Add operational runbooks for judge and leaderboard behavior.
   - Prepare deployment and migration checklists for launch.

### Beyond Phase 2

- Production hardening of cost controls: decide whether free fallback should remain available for all users or only for demo / emergency cases.
- If traffic grows, consider separating judge scoring into a dedicated queue or service boundary.
- Add a small admin-facing cost dashboard so API consumption and credit depletion are visible before the system surprises operators.

## Recommended Next Steps

1. Lock down leaderboard ops first. That is the highest-value remaining launch risk because it affects freshness and trust.
2. Add runbooks and alerts before any new feature work.
3. Then move into the onchain payout skeleton, starting with dry-run data structures and approval gates.

## Files Most Relevant For Pickup

- [`.github/workflows/ci.yml`](.github/workflows/ci.yml)
- [`backend/apps/judge/views.py`](backend/apps/judge/views.py)
- [`backend/apps/ai_core/service.py`](backend/apps/ai_core/service.py)
- [`backend/apps/ai_core/heuristics.py`](backend/apps/ai_core/heuristics.py)
- [`backend/apps/judge/tests/test_views.py`](backend/apps/judge/tests/test_views.py)
- [`backend/apps/quests/serializers.py`](backend/apps/quests/serializers.py)
- [`backend/apps/quests/tests/test_admin_campaigns_authenticated.py`](backend/apps/quests/tests/test_admin_campaigns_authenticated.py)

## Working Notes For The Next Agent

- Keep changes narrow and test the touched slice first.
- Prefer additive changes over behavioral rewrites unless the phase doc explicitly demands a break.
- If validation needs Django, use the repo-managed backend environment and be ready to fall back to SQLite for isolated checks.
- The judge service now has a heuristic safety net; only change that behavior intentionally.
