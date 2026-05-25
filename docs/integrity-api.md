# Integrity API — protocol pilot reference

**Product phase:** ADR Phase 2 (Sybil / reputation)  
**Positioning:** Passport filters humans. AI(r)Drop filters farmers and scores contribution quality.

Base URL: `https://api.airdrop.works/api/v1/integrity/` (local: `http://localhost:8001/api/v1/integrity/`)

---

## Public endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `{wallet}/` | Wallet integrity bundle (scores, farming %, flag) |
| GET | `policies/` | Allocation preset catalog |

### Wallet bundle (example)

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

## Staff / operator endpoints (JWT admin)

| Method | Path | Description |
|--------|------|-------------|
| GET | `export/?output=csv&preset=airdrop_strict` | Pilot CSV with tier recommendations |
| POST | `allocate/` | Classify wallets with a preset (JSON or CSV) |
| GET | `console/overview/` | Dashboard aggregates |
| GET | `console/wallets/?preset=grants_balanced` | Paginated wallet table with tiers |
| GET | `console/appeals/` | Appeals queue |

### Allocation presets

| Key | Use case |
|-----|----------|
| `airdrop_strict` | Token snapshots — high bar, farmers excluded |
| `grants_balanced` | Creator grants — review tier for edge cases |
| `allowlist_genuine_only` | Pre-snapshot allowlist — genuine flag only |

### Export columns (with `preset`)

`walletAddress`, scores, `farmingFlag`, `farmingPercentage`, `tier`, `recommendedAction`, `allocationWeight`, `appealEligible`, `rationale`

---

## UI surfaces

- **Protocol console:** `/console` (staff login) — overview, preset picker, CSV download
- **Campaign Integrity Pilot:** landing `#campaign-integrity-pilot` + waitlist `?intent=campaign_integrity_pilot`
- **Contributor appeals:** dashboard scoring history → dispute farming flag

---

## Local verification

```bash
docker compose exec backend uv run python manage.py seed_demo
./scripts/phase2_pilot_smoke.sh
uv run pytest apps/integrity/tests/test_allocation.py -q
```

Staff export:

```bash
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  "http://localhost:8001/api/v1/integrity/export/?output=csv&preset=airdrop_strict" -o pilot.csv
```
