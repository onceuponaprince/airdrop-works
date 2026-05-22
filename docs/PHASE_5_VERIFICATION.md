# Phase 5 Verification Checklist

**Plan:** [`superpowers/plans/2026-05-22-phase-5-parallel-execution.md`](superpowers/plans/2026-05-22-phase-5-parallel-execution.md)  
**Baseline:** `0.5.2` → **Release:** `0.6.0`

## Wave 1 — History + portable export

| Resource | Path | Auth |
|----------|------|------|
| Reputation history | `GET /api/v1/profiles/<wallet>/reputation/history/?limit=&offset=` | Public (rate-limited) |
| Portable export | `GET /api/v1/profiles/<wallet>/reputation/export/?history_limit=` | Public (rate-limited) |

### History response (minimum)

```json
{
  "walletAddress": "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
  "count": 12,
  "limit": 50,
  "offset": 0,
  "results": [
    {
      "id": "uuid",
      "platform": "twitter",
      "contentPreview": "Thread on concentrated liquidity…",
      "compositeScore": 88,
      "farmingFlag": "genuine",
      "scoredAt": "2026-05-22T00:00:00+00:00"
    }
  ]
}
```

### Portable export (minimum)

```json
{
  "@context": "https://airdrop.works/schemas/reputation/v1",
  "type": "PortableReputationExport",
  "specVersion": "1.0.0",
  "exportedAt": "2026-05-22T00:00:00+00:00",
  "walletAddress": "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
  "summary": { "compositeScore": 72, "contributionCount": 12 },
  "profile": { "totalXp": 5000, "primaryBranch": "educator" },
  "history": [],
  "meta": { "historyCount": 12, "historyLimit": 50 }
}
```

## Wave 0 — Contract freeze

| Artifact | Path |
|----------|------|
| Profile reputation schema | `schemas/reputation/v1/profile-reputation.schema.json` |
| Schema changelog | `schemas/reputation/CHANGELOG.md` |
| Endpoint smoke | `scripts/verify_phase5_endpoints.sh` |
| Gate script | `scripts/verify_phase5_gate.sh` |

## API contract (Wave 0)

| Resource | Path | Auth |
|----------|------|------|
| Wallet reputation | `GET /api/v1/integrity/<wallet_address>/` | Public (rate-limited) |
| Staff export | `GET /api/v1/integrity/export/?format=json\|csv` | Admin |

### Profile reputation response (minimum)

```json
{
  "walletAddress": "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
  "compositeScore": 72,
  "teachingValue": 70,
  "originality": 68,
  "communityImpact": 75,
  "farmingFlag": "genuine",
  "farmingPercentage": 10,
  "contributionCount": 12,
  "scoredAt": "2026-05-22T00:00:00+00:00"
}
```

## Smoke

```bash
./scripts/verify_phase4_gate.sh
./scripts/verify_phase5_endpoints.sh
./scripts/verify_phase5_gate.sh
```

## Wave 0 sign-off

- [x] `test_reputation_schema.py` passes
- [x] `verify_phase5_gate.sh` green
- [x] Schema `additionalProperties: false` matches live API keys

## Wave 1 sign-off

- [x] `test_reputation_history.py` + `test_reputation_export.py` pass
- [x] `verify_phase5_endpoints.sh` hits history + export paths

## Wave 2 — Appeals + protocol console

| Resource | Path | Auth |
|----------|------|------|
| Submit appeal | `POST /api/v1/integrity/appeals/` | Authenticated |
| My appeals | `GET /api/v1/integrity/appeals/me/` | Authenticated |
| Resolve appeal | `POST /api/v1/integrity/appeals/<uuid>/resolve/` | Admin |
| Console overview | `GET /api/v1/integrity/console/overview/` | Admin |
| Console wallets | `GET /api/v1/integrity/console/wallets/?limit=&offset=` | Admin |
| Console appeals | `GET /api/v1/integrity/console/appeals/?status=&limit=&offset=` | Admin |

Staff UI v0: Django admin `ScoreAppeal` (`/admin/integrity/scoreappeal/`).

### Appeal create (minimum)

```json
{
  "contribution_id": "uuid",
  "reason": "At least 20 characters explaining why the farming flag is wrong."
}
```

### Console overview (minimum)

```json
{
  "walletsWithScores": 42,
  "scoredContributions": 120,
  "averageCompositeScore": 68,
  "farmingRatePercent": 12,
  "pendingAppeals": 3,
  "resolvedAppeals": 7
}
```

## Wave 2 sign-off

- [x] `test_appeals.py` + `test_console.py` pass
- [x] `verify_phase5_endpoints.sh` hits console overview (401 without auth)
- [x] Migration `0001_score_appeal` applied

## Wave 3 — Gate + E2E + release

| Check | Command / artifact |
|-------|-------------------|
| Full integrity pytest | `pytest apps/integrity/tests/` |
| Portable export schema | `test_portable_export_schema.py` |
| Playwright journey | `frontend/tests/e2e/journeys/reputation-portable.spec.ts` |
| Phase complete doc | `docs/PHASE_5_COMPLETE.md` |

## Wave 3 sign-off

- [x] `verify_phase5_gate.sh` green (all integrity tests + phase 4 regression)
- [x] Playwright `reputation-portable` spec passes in CI
- [x] Monorepo version **0.6.0**

## Release

**0.6.0** — portable reputation network feature-complete (Phase 5).
