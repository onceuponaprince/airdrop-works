# ADR 0001: Graph store — Neo4j

## Status

Accepted — 2026-03-26

## Context

The SPORE build plan (Phase 0, β.0.2) called for choosing a graph database for native node/edge storage, traversal, and future graph-native features (shortest path, multi-hop queries, graph learning).

The codebase currently persists SPORE graph structure in **PostgreSQL** (`spore_graph_nodes`, `spore_graph_edges`) with **Qdrant** for vector similarity. That stack is sufficient for an MVP retrieval loop but is not the long-term target for graph-heavy workloads.

## Decision

Adopt **Neo4j** as the primary graph database for SPORE.

ArangoDB was considered as a multi-model alternative; it is not selected for this product line so we avoid operating two document/graph paradigms at equal priority.

## Rationale

- **Cypher** and Neo4j’s APIs match the product direction: labeled property graphs, path queries, and clear operational tooling.
- **Ecosystem maturity** (drivers, hosting options, observability) fits a production graph service alongside Django.
- **Team direction**: explicit choice to standardize on Neo4j rather than Postgres-as-graph for the core SPORE graph.

## Consequences

- **Positive**: First-class graph queries, indexing for traversals, and a clear migration path from relational edge tables.
- **Negative**: Additional operational surface (Neo4j deployment, backups, upgrades); data must be **synced or migrated** from current Postgres graph tables and kept consistent with ingestion/Qdrant where needed.

## Implementation status

Implemented in this repo:

- Neo4j service wired into `docker-compose.yml`
- Django settings/env flags added for Neo4j access
- `neo4j` Python driver added
- feature-flagged sync module added at `backend/apps/spore/services/neo4j_client.py`
- dual-write hooks added in `backend/apps/spore/services/graph.py`
- backfill command added: `python manage.py sync_spore_neo4j`

Still deferred:

- production read path on Neo4j (current query/traversal path remains Postgres + Redis + Qdrant)
- canonical id/constraint/index strategy beyond `node_key`
- rollback/cutover plan for retiring or narrowing Postgres graph tables once parity is verified

## References

- `spore-build-plan.md` — Phase 0 (β.0.2), Phase 1 (graph DB migration)
- `SPORE_READ_Me.md` — current MVP storage notes
