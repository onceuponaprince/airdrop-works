# Ingestion pipeline — operations

**Phase 2 owner:** ingestOps lane  
**Code:** `backend/apps/contributions/tasks.py`, `crawlers.py`, beat schedule in `config/settings/base.py`

## Services required

```bash
docker compose up -d redis celery celery-beat backend
```

Without `celery` + `celery-beat`, manual judge paste works; automated crawl→score does not.

## Celery beat schedule

| Beat key | Task | Default interval | Setting |
|----------|------|------------------|---------|
| `crawl-all-active-sources` | `contributions.crawl_all_active_sources` | 15 min | `CRAWLER_BEAT_MINUTES` |
| `leaderboard-rebuild-all` | `leaderboard.rebuild_all` | 15 min | fixed 900s |

Per-source work is queued as `contributions.crawl_source_config` (`max_retries=2`, `retry_delay=30s`). New contributions enqueue `ai_core.score_contribution` on the **`judge`** queue.

## User flow

1. User configures source at `/sources` (`POST /api/v1/contributions/sources/`).
2. Beat or manual `POST .../sources/{id}/crawl/` runs `crawl_source_config_task`.
3. New items create `Contribution` rows and enqueue `score_contribution_task`.
4. Scored rows appear on `/dashboard`.

## Verify

```bash
docker compose run --rm backend uv run pytest apps/contributions/tests/test_tasks.py -q
export USER_TOKEN="<jwt>"
./scripts/verify_phase2_endpoints.sh
```

## Failure signals

| Symptom | Check |
|---------|--------|
| No new contributions | `CrawlSourceConfig.last_error`, worker logs |
| Unscored rows | `score_contribution_task` on `judge` queue, worker consuming `judge` |
| Stale cursor | `cursor` field; reset via API/admin |
| Repeated failures | Celery retries (2×); `last_error` truncated to 2000 chars |

## Alerting (Phase 2)

- Monitor `last_error` non-empty on active sources for > 1h.
- See `runbooks/alerts/prometheus_leaderboard_alert.yaml` for leaderboard staleness pattern.
