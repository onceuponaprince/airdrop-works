# Grafana panels — Phase 2 quick-win

Wire these after Prometheus scrapes Django/Celery metrics (or log-derived exporters).

## Judge & credits

| Panel | Query / signal | Alert |
|-------|----------------|-------|
| LLM calls / min | `rate(ai_llm_calls_total[5m])` by `mode` | Spike in `mode=heuristic` when `JUDGE_HEURISTIC_FALLBACK_ENABLED=false` |
| Credits deducted | `sum(rate(payments_credits_deducted_total[1h]))` | Flatline during traffic (billing broken) |
| Judge score latency p95 | histogram `judge_score_duration_seconds` | p95 > 30s |

## Ingestion

| Panel | Signal | Alert |
|-------|--------|-------|
| Crawl failures | count sources with `last_error != ""` | > 0 active sources with error > 1h |
| Contributions created / hour | DB or task metric | Drop to 0 while sources active |
| `score_contribution` queue depth | Celery `judge` queue | Depth > 100 for 15m |

## Leaderboard

| Panel | Signal | Alert |
|-------|--------|-------|
| Last successful rebuild | timestamp from task heartbeat | Stale > 1h — use `runbooks/alerts/prometheus_leaderboard_alert.yaml` |

## Deploy notes

- Import `prometheus_leaderboard_alert.yaml` into PrometheusRule CRD or Grafana Mimir.
- Link Sentry issues tagged `celery` + `judge` to the same on-call rotation as API 5xx.
