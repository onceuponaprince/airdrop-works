Phase 2 Dispatch — airdrop-works

Date: 2026-05-21 (updated)  
Owner: @you (assign as needed)

**Canonical plan:** [`docs/superpowers/plans/2026-05-21-phase-2-parallel-execution.md`](docs/superpowers/plans/2026-05-21-phase-2-parallel-execution.md)  
**Prep:** [`docs/PHASE_2_PREP.md`](docs/PHASE_2_PREP.md) · **Verification:** [`docs/PHASE_2_VERIFICATION.md`](docs/PHASE_2_VERIFICATION.md)

Goal
- Move from 0.2.5 platform-ready app into Phase 2: **automated crawl→score**, **B2B integrity export**, **onchain payout boundary**, and launch UX/monitoring.

Top priorities
1. Integration tests + CI
   - Add pytest-django tests for `apps/quests` and `apps/judge` (coverage gate).
   - Add GitHub Action to run `pnpm install && pnpm build` (frontend) and `pytest` (backend).

2. Judge scaling & cost controls
   - Add streaming LLM rate limiter and credits enforcement.
   - Add a fallback lightweight heuristic scorer for free/demo traffic.

3. Leaderboard operationalization
   - Monitor Celery `leaderboard.rebuild_all` task; add alerting and runbook.
   - Add incremental rebuild hooks when key contributions change.

4. Onchain reward pipeline (MVP)
   - Draft payout batch job skeleton (dry-run mode + admin approval).
   - Add reward token contract ABI + gas-estimate helper.

5. UX / Wallet polish
   - Add clear wallet error modal flows and analytics events.
   - Finalize Particle fallback connector list and QA on major chains.

6. Release & telemetry
   - Add Sentry/analytics integration on frontend/backend.
   - Prepare migration and deployment checklist.

Prereqs (Phase 2 kickoff)
- Phase 1 verification complete (syntax checks and endpoint smoke tests).
- Backend devenv with Django installed and `python manage.py check` passing.
- CI runner templates available for frontend + backend.

Immediate next steps (this sprint)
- Create integration tests for `AdminCampaign` create/update flows.
- Add a GitHub Action skeleton to run backend `pytest` and frontend `pnpm build`.
- Schedule a 1-hour handoff demo with engineering + product to align scope.

Artifacts to deliver
- `tests/` additions for quests and judge.
- `.github/workflows/ci.yml` with job matrix (node/python).
- `runbooks/leaderboard.md` and `runbooks/judge.md` for ops.

Notes
- Keep API surface and serializers stable; prefer additive changes only.
- Validate cost estimates for LLM usage before enabling high-traffic scoring.


