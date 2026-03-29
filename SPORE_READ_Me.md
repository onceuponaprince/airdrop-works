# SPORE AI Revamp — Study Guide

This document explains what was implemented for the SPORE-aligned AI revamp, why it was added, and how to run and inspect it.

---

## 1) What Changed

The backend moved from a text-only AI judge flow to a hybrid intelligence flow that combines:

- content + interaction ingestion
- graph persistence in Postgres
- vector indexing in Qdrant
- graph-derived relationship features
- composed scoring (text signals + graph signals + confidence)

This matches the requested Milestones A-E from the SPORE revamp plan.

---

## 2) New SPORE Module

Main package:

- `backend/apps/spore/`

Key files:

- `backend/apps/spore/models.py`
  - `GraphNode`: graph entities (account/content/entity/signal)
  - `GraphEdge`: weighted typed edges (mentions, reply_to, semantic, etc.)
  - `Observation`: raw normalized event records
  - `ScoreRun`: audit trail for scoring versions and variable vectors
- `backend/apps/spore/types.py`
  - typed dataclass schemas:
    - `Observation`
    - `GraphNode`
    - `GraphEdge`
    - `ScoringContext`
    - `ScoreVector`
- `backend/apps/spore/services/`
  - `embedding.py`: deterministic local embedding function
  - `qdrant.py`: lightweight Qdrant REST client
  - `ingestion.py`: content ingestion, Twitter event graph upserts, semantic edge creation
  - `graph.py`: graph helpers, spreading activation, Twitter pair feature extraction
  - `scoring.py`: score composition (judge + graph variables)
- `backend/apps/spore/views.py`
  - DRF APIs for ingest/query/relationship summary/brief generation stub
- `backend/apps/spore/tasks.py`
  - Celery sporulation task
- `backend/apps/spore/migrations/`
  - schema migrations for SPORE tables

---

## 3) Infrastructure and Settings Changes

### Docker

`docker-compose.yml` now includes:

- `qdrant` service (`qdrant/qdrant:v1.13.6`)
- `qdrant_data` volume
- SPORE env vars on backend/celery services

### Django settings

`backend/config/settings/base.py`:

- added `apps.spore` to `INSTALLED_APPS`
- added SPORE env config:
  - `SPORE_QDRANT_ENABLED`
  - `SPORE_QDRANT_URL`
  - `SPORE_QDRANT_COLLECTION`
  - `SPORE_QDRANT_TIMEOUT_SECONDS`
  - `SPORE_ACTIVATION_TTL_SECONDS`
  - `SPORE_ENABLE_PHASE3`
  - `SPORE_SPORULATION_BEAT_MINUTES`
- added Celery beat schedule:
  - `spore.sporulate_recent_nodes`

### CI

`.github/workflows/ci.yml`:

- adds Qdrant service for CI job boot
- keeps SPORE Qdrant logic disabled in tests by default (`SPORE_QDRANT_ENABLED=false`) to avoid flaky network dependency

### Env template

`backend/.env.example` has SPORE variables documented.

---

## 4) API Endpoints Added

Registered under:

- `backend/config/urls.py` -> `api/v1/spore/`

Defined in `backend/apps/spore/urls.py`:

- `POST /api/v1/spore/ingest/`
  - ingest raw text payload into graph + optional vector upsert
- `POST /api/v1/spore/query/`
  - query text -> seed nodes -> spreading activation -> ranked nodes
- `GET /api/v1/spore/relationships/twitter/?account_a=...&account_b=...&days=30`
  - returns pairwise relationship features from graph/observations
- `POST /api/v1/spore/briefs/generate/`
  - Phase 3 stub (feature-flagged by `SPORE_ENABLE_PHASE3`)

---

## 5) Twitter Ingestion Upgrade

Updated crawler:

- `backend/apps/contributions/crawlers.py`

`CrawledItem` now carries:

- `actor_id`
- `actor_handle`
- `mentions[]`
- `referenced_tweets[]`

Twitter API call now requests interaction-bearing fields (mentions/references metadata), enabling relationship variables.

Updated task pipeline:

- `backend/apps/contributions/tasks.py`

When platform is Twitter:

- creates/upserts SPORE nodes and edges via `record_twitter_item(...)`
- persists interaction hints into contribution metadata (`spore_author`, `spore_mentions`)
- keeps previous contribution persistence + queue behavior

Reddit crawler slice:

- Required env vars: `REDDIT_CLIENT_ID`, `REDDIT_CLIENT_SECRET`, `REDDIT_USER_AGENT`
- Trigger endpoint: `POST /api/v1/contributions/crawl/reddit/`
- Example body: `{ "subreddit": "python" }`
- The Reddit crawler stores subreddit context in contribution metadata and mirrors posts into SPORE via `record_reddit_item(...)`

---

## 6) Scoring Orchestrator v2

Legacy flow:

- `backend/apps/ai_core/workflow.py` previously scored from text alone

New flow:

- `run_scoring_pipeline(...)` now calls `_score_contribution_v2(...)`
- `_score_contribution_v2(...)` delegates to `apps.spore.services.scoring.compose_contribution_score(...)`

Composition behavior:

- text component from existing judge service (`apps.judge.service`)
- graph component from relationship features
- merged `composite_score`
- confidence value
- explainability strings
- persisted score audit in `ScoreRun`

Backwards compatibility is preserved at the workflow level:

- contribution fields are still updated (`teaching_value`, `originality`, `community_impact`, `total_score`, etc.)
- XP logic still runs from the composite score and farming flag

---

## 7) Retrieval and Activation Design

Current MVP graph retrieval path:

1. Query text -> deterministic embedding
2. Qdrant search for nearest content nodes (if enabled)
3. fallback to recent content nodes when Qdrant disabled/unavailable
4. spreading activation over graph edges with damping + hops
5. return ranked activated nodes

This gives a practical SPORE Phase-1 style retrieval loop without requiring a dedicated graph DB yet.

---

## 8) Migrations and Data Model

SPORE migrations added under:

- `backend/apps/spore/migrations/0001_initial.py`
- `backend/apps/spore/migrations/0002_alter_graphedge_options_alter_graphnode_options_and_more.py`

Tables introduced:

- `spore_graph_nodes`
- `spore_graph_edges`
- `spore_observations`
- `spore_score_runs`

These include uniqueness and index constraints needed for dedupe, traversal and analytics.

---

## 9) Tests Added and Verified

New tests:

- `backend/apps/spore/tests/test_types.py`
- `backend/apps/spore/tests/test_qdrant.py`
- `backend/apps/spore/tests/test_views.py`

Adjusted existing tests:

- `backend/apps/ai_core/tests/test_workflow.py` now patches v2 scoring call

Validated with:

- `ruff check` on touched files
- `pytest` for affected suites:
  - spore tests
  - ai_core workflow tests
  - contribution crawler view tests

---

## 10) How to Run Locally

### A) Start infra/services

From repo root:

```bash
docker compose up postgres redis qdrant backend celery_worker celery_beat -d
```

### B) Ensure env values

In `backend/.env` include:

- `SPORE_QDRANT_ENABLED=true`
- `SPORE_QDRANT_URL=http://qdrant:6333` (docker network)
- `SPORE_QDRANT_COLLECTION=spore_nodes`
- `SPORE_ENABLE_PHASE3=false` (or true to test brief generation stub)

### C) Exercise endpoints

1) Ingest:

```bash
POST /api/v1/spore/ingest/
{
  "source_platform": "manual",
  "external_id": "demo-1",
  "text": "Some content to index"
}
```

2) Query:

```bash
POST /api/v1/spore/query/
{
  "query_text": "content relationship",
  "hops": 2,
  "damping": 0.65,
  "top_k": 10
}
```

3) Relationship summary:

```bash
GET /api/v1/spore/relationships/twitter/?account_a=alice&account_b=bob&days=30
```

4) Phase 3 stub (if enabled):

```bash
POST /api/v1/spore/briefs/generate/
{
  "brand": "SPORE",
  "audience": "crypto builders",
  "platform": "twitter",
  "tone": "analytical",
  "objective": "increase engagement",
  "concept_count": 5
}
```

---

## 11) Current Limits (Intentional for MVP)

- embedding function is deterministic local stub (not production model yet)
- relationship features currently focus on mentions/replies/graph-derived overlap from available data
- follows and richer platform signals depend on API access tier and additional enrichment jobs
- dedicated graph DB (Neo4j/Arango) is deferred; Postgres + Qdrant currently power the MVP
- Phase 3 generation path is a scaffolded stub behind a feature flag

---

## 12) Suggested Next Steps

1. Replace deterministic embeddings with a production embedding model.
2. Add richer Twitter relationship extraction (follows, quote/reply attribution, conversation threading).
3. Add stronger score calibration and evaluation datasets (offline and online).
4. Extend frontend to consume new `/api/v1/spore/*` endpoints.
5. Add observability dashboards for graph growth, score drift, and retrieval quality.

---

## 13) File Index (Quick Navigation)

- `backend/apps/spore/`
- `backend/apps/spore/models.py`
- `backend/apps/spore/types.py`
- `backend/apps/spore/services/embedding.py`
- `backend/apps/spore/services/qdrant.py`
- `backend/apps/spore/services/ingestion.py`
- `backend/apps/spore/services/graph.py`
- `backend/apps/spore/services/scoring.py`
- `backend/apps/spore/views.py`
- `backend/apps/spore/urls.py`
- `backend/apps/spore/tasks.py`
- `backend/apps/contributions/crawlers.py`
- `backend/apps/contributions/tasks.py`
- `backend/apps/ai_core/workflow.py`
- `backend/config/settings/base.py`
- `backend/config/urls.py`
- `backend/.env.example`
- `docker-compose.yml`
- `.github/workflows/ci.yml`

---

## 14) White-Label Starter Pass (Items 1-4)

This pass adds a practical multi-tenant foundation so SPORE can be packaged per customer.

### A) Tenantization starter

New models:

- `Tenant`
- `TenantMembership`

Routing behavior:

- SPORE views now resolve tenant context from:
  - `X-SPORE-API-KEY` (tenant comes from key)
  - or authenticated user membership (optional `X-SPORE-TENANT` override)

Security behavior:

- SPORE ops/history endpoints are tenant-scoped.
- Score runs now persist tenant context when available.

### B) API keys + usage metering

New model:

- `SporeApiKey` (hash-only storage; plaintext returned once at create-time)

New endpoints:

- `GET /api/v1/spore/ops/api-keys/`
- `POST /api/v1/spore/ops/api-keys/`
- `POST /api/v1/spore/ops/api-keys/<uuid>/revoke/`
- `GET /api/v1/spore/ops/tenant-context/`
- `GET /api/v1/spore/ops/usage-events/`
- `GET /api/v1/spore/ops/audit-logs/`

Metering:

- Every SPORE request now writes `UsageEvent` rows for billing/analytics.

### C) Quotas / limits

New model:

- `UsageDailyCounter`

Per-tenant daily quotas (stored on `Tenant`):

- query
- ingest
- relationship analysis
- brief generation

Enforcement:

- Requests that exceed quota are denied before main processing.

### D) Audit logs + retention

New model:

- `AuditLog`

Logged actions include:

- ingest
- query
- relationship checks
- API key create/revoke

Retention:

- New Celery task: `spore.purge_audit_logs`
- Daily schedule configured in `CELERY_BEAT_SCHEDULE`
- Retention controlled by `SPORE_AUDIT_RETENTION_DAYS` in env settings

Frontend operator additions:

- `frontend/src/app/(app)/spore-lab/page.tsx` now includes:
  - tenant context card with active plan and quotas
  - API key create/list/revoke controls
  - usage events feed with metric filter
  - audit logs feed with action filter

Launch operations assets:

- `backend/apps/spore/management/commands/provision_spore_tenant.py`
- `backend/apps/spore/services/seeding.py`
- `backend/apps/spore/management/commands/seed_spore_scenario.py`
- `backend/scripts/spore_launch_smoke.py`
- `LAUNCH_CHECKLIST.md`
- `RUNBOOK.md`

