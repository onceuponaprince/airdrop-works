# Phase 2 Verification Checklist

**Depends on:** [`PLATFORM_READY.md`](PLATFORM_READY.md) (0.2.5)  
**Plan:** [`superpowers/plans/2026-05-21-phase-2-parallel-execution.md`](superpowers/plans/2026-05-21-phase-2-parallel-execution.md)

## API contract (target — implement in Wave 1)

| Resource | Path | Auth |
|----------|------|------|
| Wallet integrity | `GET /api/v1/integrity/{wallet_address}/` | Public or API key (TBD) |
| Pilot export | `GET /api/v1/integrity/export/?format=csv` | Staff |
| Crawl sources | `GET/POST /api/v1/contributions/sources/` | JWT |
| Manual crawl | `POST /api/v1/contributions/sources/{id}/crawl/` | JWT |
| Payout dry-run | `manage.py payout_batch --dry-run` | Staff CLI |

### Integrity payload (minimum)

```json
{
  "walletAddress": "0x…",
  "compositeScore": 72,
  "teachingValue": 80,
  "originality": 65,
  "communityImpact": 70,
  "farmingFlag": "genuine",
  "farmingPercentage": 12,
  "contributionCount": 14,
  "scoredAt": "2026-05-21T12:00:00Z"
}
```

---

## Required services (automated ingestion)

- [ ] `celery` worker running
- [ ] `celery-beat` running (scheduled crawl)
- [ ] `REDIS_URL` shared between API and workers
- [ ] At least one `CrawlSourceConfig` in `active` status (reddit or twitter)

## Required test users

- [ ] Authenticated user with connected crawl source
- [ ] Staff user for export + payout dry-run

---

## Endpoint smoke tests

```bash
export BASE_URL="${BASE_URL:-http://localhost:8001}"
export USER_TOKEN="${USER_TOKEN:-}"      # JWT from wallet-verify
export ADMIN_TOKEN="${ADMIN_TOKEN:-}"

# Health
curl -sf "$BASE_URL/api/v1/health/"

# Crawl sources (authenticated)
curl -sf "$BASE_URL/api/v1/contributions/sources/" \
  -H "Authorization: Bearer $USER_TOKEN"

# Integrity (after Wave 1 implementation)
curl -sf "$BASE_URL/api/v1/integrity/0x0000000000000000000000000000000000000000/" || true

# Phase 1 regression
./scripts/verify_phase1_endpoints.sh
```

---

## Automated ingestion pilot (manual)

1. Log in → `/sources` → connect Reddit subreddit or Twitter handle.
2. Trigger **Connect + crawl** or wait for beat schedule.
3. Confirm new row in `/dashboard` **Scoring History** (not only manual `/judge` paste).
4. Check admin stats: `activeCrawlSources` increments.

## Onchain boundary (no mainnet)

```bash
docker compose exec backend uv run python manage.py payout_batch --dry-run
```

- [ ] Output lists planned payouts without broadcast
- [ ] Idempotency key shown per approval (after Wave 1)
- [ ] `pytest apps/rewards/tests/test_payout_batch.py` passes

---

## Frontend gates

```bash
cd frontend && pnpm lint && pnpm build
```

- [ ] Wallet connect error shows actionable retry (Wave 2 uxPolish)
- [ ] Sources page shows last crawl / error state

---

## CI / release

- [ ] `.github/workflows/ci.yml` green on PR
- [ ] `CHANGELOG.md` Unreleased → `0.3.0` section filled
- [ ] Monorepo version bump `package.json`, `frontend/package.json`, `backend/pyproject.toml`

---

## Script

```bash
./scripts/verify_phase2_endpoints.sh
```
