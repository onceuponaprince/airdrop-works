# Leaderboard Runbook

Purpose: Operational steps to monitor, rebuild, and recover the leaderboard subsystem.

Checks
- Verify `leaderboard.rebuild_all` Celery task runs successfully (cron or manual).
- Check Redis and Postgres connectivity on backend nodes.
- Confirm Celery worker and beat processes are running.

Common Commands

- Rebuild leaderboard:
  ```bash
  uv run python manage.py shell -c "from apps.leaderboard.tasks import rebuild_leaderboard; rebuild_leaderboard()"
  ```

- Rebuild leaderboard via Celery:
  ```bash
  uv run python manage.py shell -c "from apps.leaderboard.tasks import rebuild_leaderboard; rebuild_leaderboard.delay()"
  ```

Troubleshooting
- If `rebuild_all` fails with DB errors: check migrations and DB health. Restore snapshot if corruption suspected.
- If Celery tasks queue up: restart Celery worker and beat, inspect `celery --concurrency` and memory.
- If results look stale: confirm the scheduled rebuild ran recently and that `Contribution` scoring populated `xp_awarded` / `scored_at`.

Alerts and Monitoring
- Create an alert for Celery task failures on `leaderboard.rebuild_all` (Sentry + PagerDuty integration).
- Add a metric for time since last successful `rebuild_all` and alert if > 1 hour for production.

Postmortem Steps
- Run a targeted rebuild for affected campaigns only before full rebuild to contain blast radius.
- Collect logs (`journalctl` / Celery logs) and store a snapshot in the incident ticket.
