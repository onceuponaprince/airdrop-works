# Phase 1 Verification Checklist

## API contract (canonical paths)

| Resource | Canonical path | Spec alias (optional) |
|----------|----------------|----------------------|
| Rubric CRUD | `GET/POST /api/v1/judge/rubric/` | — |
| Rubric detail | `GET/PUT/PATCH/DELETE /api/v1/judge/rubric/{id}/` | — |
| Admin campaigns | `GET/POST /api/v1/quests/admin/campaigns/` | `GET/POST /api/v1/admin/campaigns/` |
| Admin campaign detail | `GET/PUT/PATCH/DELETE /api/v1/quests/admin/campaigns/{id}/` | `/api/v1/admin/campaigns/{id}/` |
| Admin contributions | `GET /api/v1/contributions/admin/` | `/api/v1/admin/contributions/` |
| Admin contribution detail | `GET /api/v1/contributions/admin/{id}/` | `/api/v1/admin/contributions/{id}/` |
| Admin stats | `GET /api/v1/admin/stats/` | — |

### Rubric weights

- **Storage/API:** floats `0.0–1.0` (sum target `1.0`)
- **UI:** may display `0–100` with conversion (`ui / 100` on submit)

### Rubric ↔ campaign link

- Field: `questId` (alias `campaignId`) → `quests.Quest` FK on `ScoringRubric.quest` (nullable)

---

## Required test users

- [ ] Anonymous user
- [ ] Authenticated non-admin user
- [ ] Authenticated admin user (`is_staff` + `is_superuser`)

## Required sample data

- [ ] At least 2 campaigns (one active, one upcoming)
- [ ] At least 3 contributions (mixed scores)
- [ ] At least 1 contribution flagged as farming
- [ ] At least 1 scoring rubric linked to a quest

## Permission tests

- [ ] Anonymous cannot POST/PUT/DELETE rubric
- [ ] Non-admin cannot POST/PUT/DELETE rubric
- [ ] Admin can POST/PUT/DELETE rubric
- [ ] Anonymous cannot access admin campaign/contribution/stats endpoints
- [ ] Non-admin cannot access admin endpoints
- [ ] Admin can access all admin endpoints

## Endpoint smoke tests

### Rubric API

```bash
curl -s http://localhost:8000/api/v1/judge/rubric/
curl -s -X POST http://localhost:8000/api/v1/judge/rubric/ \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","teachingValueWeight":0.34,"originalityWeight":0.33,"communityImpactWeight":0.33}'
```

### Admin campaigns

```bash
curl -s http://localhost:8000/api/v1/quests/admin/campaigns/ \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### Admin contributions

```bash
curl -s "http://localhost:8000/api/v1/contributions/admin/?min_score=10" \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### Admin stats

```bash
curl -s http://localhost:8000/api/v1/admin/stats/ \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

## Frontend smoke tests

- [ ] Wallet connects without error messages
- [ ] Wallet error displays friendly message + retry (`lastError` on context)
- [ ] Fallback wallet metadata available (ConnectKit uses Particle defaults)
- [ ] Campaign rubric form displays + validates weight sum
- [ ] AI Judge scoring initiates + streams NDJSON + completes
- [ ] AI Judge error state shows + allows retry

## Full stack gate

```bash
cd frontend && pnpm lint && pnpm build
cd backend && uv run pytest
docker compose up -d
curl -s http://localhost:8000/api/v1/health/
```

On failure: record command, first error block, category (frontend/backend/db/auth/provider), and owning service lane.
