# Telemetry & Release Readiness Runbook

Purpose: Steps to configure and validate telemetry, error reporting, and alerting for launch.

1. Sentry (backend + frontend)
   - Create Sentry projects for `airdrop-works-backend` and `airdrop-works-frontend`.
   - Set `SENTRY_DSN_BACKEND` and `SENTRY_DSN_FRONTEND` in environment for staging and production.
   - Backend: install `sentry-sdk` and configure in `backend/config/settings/base.py` (initialize in startup).
   - Frontend: set Sentry DSN in the frontend env and initialize Sentry in the Next.js `_app`.
   - Verify errors appear in Sentry by sending a test event (SDK provides `capture_message`).

2. Alerts
   - Configure Sentry alert rules for: `error rate > 1% in 5m`, `new release regressions`, and `Celery task failures`.
   - Hook Sentry alerts to PagerDuty or Slack for on-call routing.
   - Add a Prometheus/Grafana alert for `time since last successful leaderboard.rebuild_all > 1h` (if using Prometheus). If not, create a Sentry heartbeat event when rebuild completes.

3. Release readiness checklist
   - Run `uv run python manage.py migrate` in staging; confirm no pending migrations.
   - Confirm feature flags and env vars for launch are set (list in `deploy/ENV_VARS.md` or `docs/`).
   - Confirm migration and rollback steps documented in `DEPLOYMENT.md`.
   - Run smoke tests (see `LAUNCH_CHECKLIST.md`) and confirm no critical errors in Sentry.

4. Verification commands
   - Send test event from backend:
     ```bash
     uv run python -c "import sentry_sdk; sentry_sdk.init('<dsn>'); sentry_sdk.capture_message('sentry test')"
     ```
   - Send test event from frontend by visiting `/debug/sentry` route if implemented, or by invoking the Sentry SDK capture call in the browser console.

5. Phase 2 metrics to expose (minimum)
   - Judge: `ai_llm_calls_total{mode="anthropic|heuristic"}`, score latency histogram.
   - Payments: credits deducted / exhausted counters per user tier.
   - Crawl: active sources with `last_error`, `contributions.crawl_source_config` success/fail counts.
   - Celery: queue depth for `judge` and `onchain-executor`.
   - See panel definitions: `docs/ops/grafana-phase2-panels.md`.

6. Post-deploy
   - Record the first successful rebuild timestamp for leaderboard in the deployment notes.
   - Verify alerts are routed and acknowledged by the on-call.
   - Confirm `runbooks/alerts/prometheus_leaderboard_alert.yaml` is loaded in staging/prod.
