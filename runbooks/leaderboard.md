# Leaderboard Runbook

Purpose: Operational steps to monitor, rebuild, and recover the leaderboard subsystem.

Checks
- Verify `leaderboard.rebuild_all` Celery task runs successfully (cron or manual).
- Check Redis and Postgres connectivity on backend nodes.
- Confirm Celery worker and beat processes are running.

Common Commands

- Rebuild leaderboard (dry-run):
  ```bash
  uv run python manage.py shell -c "from apps.leaderboard.tasks import rebuild_all; rebuild_all(dry_run=True)"
  ```

- Rebuild leaderboard (full):
  ```bash
  uv run python manage.py shell -c "from apps.leaderboard.tasks import rebuild_all; rebuild_all(dry_run=False)"
  ```

- Trigger background rebuild via Celery:
  ```bash
  uv run python manage.py shell -c "from apps.leaderboard.tasks import rebuild_all_task; rebuild_all_task.delay()"
  ```

Troubleshooting
- If `rebuild_all` fails with DB errors: check migrations and DB health. Restore snapshot if corruption suspected.
- If Celery tasks queue up: restart Celery worker and beat, inspect `celery --concurrency` and memory.
- If results look stale: confirm incremental hooks fire on `Contribution` save and that signal handlers are connected.

Alerts and Monitoring
- Create an alert for Celery task failures on `leaderboard.rebuild_all` (Sentry + PagerDuty integration).
- Add a metric for time since last successful `rebuild_all` and alert if > 1 hour for production.

Postmortem Steps
- Run a targeted rebuild for affected campaigns only before full rebuild to contain blast radius.
- Collect logs (`journalctl` / Celery logs) and store a snapshot in the incident ticket.
