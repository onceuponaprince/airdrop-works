# Phase 5 complete

**Release line:** `0.5.2` (CI green) → **`0.6.0`** (Portable reputation network)

## What shipped

| Wave | Deliverables |
|------|----------------|
| 0 | `profile-reputation.schema.json`, verify scripts, schema contract tests |
| 1 | Reputation history + portable export APIs, `portable-export.schema.json` |
| 2 | `ScoreAppeal`, appeals API, protocol console read API, Django admin |
| 3 | Full gate, Playwright reputation journey, **0.6.0** |

## Verify locally

```bash
docker compose up -d db redis backend frontend
./scripts/verify_phase5_gate.sh
cd frontend && pnpm test:e2e:ci --grep "Portable reputation"
```

## APIs (public / auth)

| Resource | Path |
|----------|------|
| Wallet reputation | `GET /api/v1/integrity/<wallet>/` |
| History | `GET /api/v1/profiles/<wallet>/reputation/history/` |
| Portable export | `GET /api/v1/profiles/<wallet>/reputation/export/` |
| Submit appeal | `POST /api/v1/integrity/appeals/` (auth) |
| Console overview | `GET /api/v1/integrity/console/overview/` (admin) |

## PRs

- [#20](https://github.com/onceuponaprince/airdrop-works/pull/20) — Wave 0 contract freeze
- [#21](https://github.com/onceuponaprince/airdrop-works/pull/21) — Wave 1 history + export
- [#22](https://github.com/onceuponaprince/airdrop-works/pull/22) — Wave 2 appeals + console

## Beyond Phase 5

Phase 6+ per `research/airdrop-direction/decisions/001-sequenced-roadmap.md` — contributor-facing reputation UI, protocol integrations, verifiable credentials (future).
