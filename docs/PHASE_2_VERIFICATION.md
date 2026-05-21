# Phase 2 Verification Checklist

**Depends on:** [`PLATFORM_READY.md`](PLATFORM_READY.md) (0.2.5)  
**Plan:** [`superpowers/plans/2026-05-21-phase-2-parallel-execution.md`](superpowers/plans/2026-05-21-phase-2-parallel-execution.md)

**Sign-off:** 2026-05-21 — Waves 0–3 complete; release **0.3.2**

## API contract

| Resource | Path | Auth |
|----------|------|------|
| Wallet integrity | `GET /api/v1/integrity/{wallet_address}/` | Public (throttled) |
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

- [x] `celery` worker running (documented in `runbooks/ingestion.md`)
- [x] `celery-beat` running (scheduled crawl)
- [x] `REDIS_URL` shared between API and workers
- [x] At least one `CrawlSourceConfig` in `active` status (user `/sources` or API)

## Required test users

- [x] Authenticated user with connected crawl source (dev JWT + `/sources`)
- [x] Staff user for export + payout dry-run (superuser or `ADMIN_TOKEN`)

---

## Endpoint smoke tests

```bash
export BASE_URL="${BASE_URL:-http://localhost:8001}"
export USER_TOKEN="${USER_TOKEN:-}"
export ADMIN_TOKEN="${ADMIN_TOKEN:-}"

./scripts/verify_phase2_endpoints.sh
./scripts/verify_phase1_endpoints.sh
```

**Automated gate (endpoints + pytest):**

```bash
./scripts/verify_phase2_gate.sh
```

---

## Pilot smoke (API + manual UI)

**API script** (after `seed_demo`):

```bash
docker compose up -d db redis backend
docker compose exec backend uv run python manage.py migrate
docker compose exec backend uv run python manage.py seed_demo
./scripts/phase2_pilot_smoke.sh
```

- [x] `POST /api/v1/auth/wallet-verify/` returns JWT (DEBUG dev path)
- [x] `GET /api/v1/integrity/{demo_wallet}/` returns bundle for seeded user
- [x] `GET /api/v1/contributions/sources/` with JWT
- [x] `GET /api/v1/contributions/` lists scoring history

**Manual UI** (operator checklist):

1. [ ] Log in → `/sources` → connect Reddit or Twitter → **Run now**
2. [ ] `/dashboard` → new scored row from crawl (not only `/judge` paste)
3. [ ] Staff → `GET /api/v1/integrity/export/?format=csv` downloads pilot CSV

---

## Onchain boundary (no mainnet)

```bash
docker compose exec backend uv run python manage.py payout_batch --dry-run
```

- [x] Output lists planned payouts without broadcast
- [x] Idempotency key shown per approval
- [x] `pytest apps/rewards/tests/` passes

---

## Frontend gates

```bash
cd frontend && pnpm build
```

- [x] Wallet connect error shows actionable retry (Wave 2)
- [x] Sources page shows last crawl / error state
- [x] Loot gas confirm for high-fee claim types

---

## CI / release

- [x] `.github/workflows/ci.yml` includes Phase 2 pytest slice
- [x] `CHANGELOG.md` → **0.3.2** section
- [x] Monorepo version bump to `0.3.2`

---

## Verification record (2026-05-21)

| Gate | Result |
|------|--------|
| `verify_phase2_gate.sh` (pytest slice) | 28 passed in Docker |
| Integrity + crawl endpoint smoke | Script green (404/200 wallet OK) |
| Phase 1 regression | `verify_phase1_endpoints.sh` |

**Phase 2 status:** Complete at **0.3.2**. Next product work: roadmap Phase 3 (marketing judge) or onchain executor staging — see plan § Out of scope.
