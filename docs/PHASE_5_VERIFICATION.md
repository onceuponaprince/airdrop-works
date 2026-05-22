# Phase 5 Verification Checklist

**Plan:** [`superpowers/plans/2026-05-22-phase-5-parallel-execution.md`](superpowers/plans/2026-05-22-phase-5-parallel-execution.md)  
**Baseline:** `0.5.2`

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

- [ ] `test_reputation_schema.py` passes
- [ ] `verify_phase5_gate.sh` green
- [ ] Schema `additionalProperties: false` matches live API keys

## Release target

**0.6.0** at Wave 3 (portable reputation network feature-complete gate).
