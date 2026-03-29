# SPORE — Complete Build Plan
## 3-Agent Concurrent Execution

## Current Phase Tracker

- Last updated: 2026-03-27
- Current phase: **Phase 2 — Ingestion Pipeline (In Progress)**
- Completion snapshot:
  - Phase 0: complete (foundation + infra in place)
  - Phase 1: complete (graph ingest/query + spreading activation + frontend SPORE Lab query tooling)
  - Phase 2: in progress (Twitter/Discord/Telegram crawler + source configs + ingestion path live; Reddit/Kafka/niche register pieces still pending)
  - Phase 3: partial scaffold only (`/briefs/generate/` is feature-flagged and currently a stub)
  - Phase 4+: not started
- Next planned Phase 2 lane: **Reddit integration** (highest-leverage gap vs current Twitter/Discord/Telegram ingestion coverage)
- Evidence to review quickly:
  - Backend: `backend/apps/spore/`, `backend/apps/contributions/`, `backend/apps/spore/services/neo4j_client.py`
  - Frontend: `frontend/src/app/(app)/spore-lab/page.tsx`, `frontend/src/middleware.ts` (app route auth)
  - ADR: `docs/adr/0001-neo4j-graph-store.md` (Neo4j graph store decision)
  - Notes: `SPORE_READ_Me.md`, `RUNBOOK.md`

### Phase Checklist (Done / Partial / Missing)

| Phase | Status | Checklist | Evidence snapshot |
|---|---|---|---|
| 0 — Foundation | Done | - [x] Done - [ ] Missing | Docker/dev stack, Django app, migrations, CI, Next.js app, typed API client, Neo4j ADR, protected app-route auth, Neo4j compose service, feature-flagged Neo4j sync client, and backfill command are now in place. |
| 1 — Core Graph | Done | - [x] Done - [ ] Missing | Node/edge models, ingest/query endpoints, spreading activation, Redis activation cache, and SPORE Lab graph query tooling are implemented. |
| 2 — Ingestion Pipeline | Partial | - [x] Done - [~] Partial - [ ] Missing | Twitter/Discord/Telegram crawling + source management + dedupe paths exist; Reddit/Kafka-specific stream and niche-register ML pieces are not complete. |
| 3 — Content Generation + Simulated Scoring | Partial | - [x] Done - [~] Partial - [ ] Missing | Brief generation endpoint and SPORE Lab UI exist, but backend generation path is feature-flagged scaffold/stub rather than full production scoring flow. |
| 4 — Feedback Loop + Graph Learning | Missing | - [ ] Missing | No deployed-content feedback ingestion loop, automatic 24h/48h/7d metric pull, or edge reinforcement/decay learning loop found as complete product features. |
| 5 — Social Curation Engineer System | Missing | - [ ] Missing | No SCE user/task/earnings/validation workflow appears implemented end-to-end yet. |
| 6 — Shortest Path + Play Tester | Missing | - [ ] Missing | No human-vs-compute path-cost routing or Play Tester decision-routing engine found. |
| 7 — Multi-State Truth Resolution | Missing | - [ ] Missing | No multi-state fork/commit truth-resolution pipeline found. |
| 8 — RL Training Engine | Missing | - [ ] Missing | No PPO/RL training pipeline or production policy rollout implementation found. |
| 9 — Source Discovery | Missing | - [ ] Missing | No automated source discovery/recommendation engine beyond manually configured crawler sources found. |
| 10 — Token Economics + airdrop.works Integration | Missing | - [ ] Missing | Core token emission/vesting/tier gating economy from this plan is not implemented as a full SPORE phase yet. |
| 11 — Advanced Bayesian Models | Missing | - [ ] Missing | No full lifecycle/shift/safety/demand Bayesian model suite deployed as described in this phase. |

Legend: `[x] done`, `[~] partial`, `[ ] missing`.

---

## Agent Roles

```
AGENT α (Alpha) — Infrastructure & Data
  Focus: Databases, APIs, ingestion pipelines, data models
  Skills: Python, FastAPI, PostgreSQL, Redis, Kafka, DevOps

AGENT β (Beta) — Intelligence & ML
  Focus: Graph algorithms, RL engine, Bayesian models, NLP
  Skills: Python, PyTorch, NumPyro, Ray, graph algorithms

AGENT γ (Gamma) — Frontend & Product
  Focus: Dashboard, UI, integrations, user-facing features
  Skills: Next.js, TypeScript, React, Tailwind, Web3
```

---

## Phase 0: Foundation
### Duration: 1 week
### Goal: Infrastructure exists. Everyone can build on top of it.

```
┌─────────────────────────────────────────────────────────────┐
│ PHASE 0 — FOUNDATION                                        │
├───────────────┬───────────────────┬─────────────────────────┤
│ AGENT α       │ AGENT β           │ AGENT γ                 │
│ Infrastructure│ Intelligence      │ Frontend                │
├───────────────┼───────────────────┼─────────────────────────┤
│               │                   │                         │
│ α.0.1 Docker  │ β.0.1 Define      │ γ.0.1 Next.js project   │
│ Compose setup │ node/edge schemas │ scaffold (App Router,   │
│ (Postgres,    │ as Python data-   │ TypeScript, Tailwind,   │
│ Redis, API)   │ classes + JSON    │ shadcn/ui)              │
│               │ schemas           │                         │
│ α.0.2 FastAPI │                   │ γ.0.2 Design system     │
│ project       │ β.0.2 Research &  │ implementation (SPORE   │
│ scaffold      │ select graph DB   │ colors, fonts, dark     │
│ (auth, CORS,  │ (ArangoDB vs      │ theme, component        │
│ health check) │ Neo4j benchmark)  │ library)                │
│               │                   │                         │
│ α.0.3 DB      │ β.0.3 Qdrant     │ γ.0.3 Auth flow (login  │
│ migrations    │ setup + test      │ page, API key mgmt,     │
│ framework     │ vector indexing   │ protected routes)       │
│ (Alembic or   │ with sample       │                         │
│ Django)       │ embeddings        │                         │
│               │                   │                         │
│ α.0.4 CI/CD   │                   │ γ.0.4 API client lib    │
│ pipeline      │                   │ (typed fetch wrapper    │
│ (GitHub       │                   │ for FastAPI endpoints)  │
│ Actions,      │                   │                         │
│ linting,      │                   │                         │
│ tests)        │                   │                         │
│               │                   │                         │
├───────────────┴───────────────────┴─────────────────────────┤
│ GATE: All agents can run `docker compose up` and see a      │
│ working API + frontend + graph DB + vector index.           │
│ Shared schema definitions committed and reviewed.           │
└─────────────────────────────────────────────────────────────┘
```

**Dependencies:** None (greenfield)
**Deliverable:** Working dev environment, shared schemas, CI/CD

---

## Phase 1: Core Graph
### Duration: 2 weeks
### Goal: Information can be ingested, stored as nodes, connected by edges, and retrieved via spreading activation.

```
┌─────────────────────────────────────────────────────────────┐
│ PHASE 1 — CORE GRAPH                                        │
├───────────────┬───────────────────┬─────────────────────────┤
│ AGENT α       │ AGENT β           │ AGENT γ                 │
├───────────────┼───────────────────┼─────────────────────────┤
│               │                   │                         │
│ α.1.1 Node    │ β.1.1 Embedding   │ γ.1.1 Graph             │
│ CRUD API      │ service (sentence │ visualization           │
│ endpoints     │ transformers,     │ component (D3 force     │
│ (create,      │ model selection,  │ graph, nodes + edges    │
│ read, update, │ batching)         │ rendered, zoomable)     │
│ soft-delete)  │                   │                         │
│               │ β.1.2 Sporulation │ γ.1.2 Node inspector    │
│ α.1.2 Edge    │ algorithm (new    │ panel (click a node,    │
│ CRUD API      │ content → embed → │ see content, edges,     │
│ endpoints     │ find K-nearest →  │ metadata, activation    │
│ (create,      │ create semantic   │ level)                  │
│ read, weight  │ edges)            │                         │
│ update,       │                   │ γ.1.3 Manual node       │
│ soft-delete)  │ β.1.3 Spreading   │ creation form           │
│               │ activation algo   │ (paste text → create    │
│ α.1.3 Graph   │ (BFS with weight- │ node → watch edges      │
│ DB schema     │ modulated signal  │ form automatically)     │
│ migration     │ propagation,      │                         │
│ (ArangoDB     │ configurable      │ γ.1.4 Edge weight       │
│ collections   │ hops + damping)   │ visualization (line     │
│ for nodes,    │                   │ thickness = weight,     │
│ edges)        │ β.1.4 Activation  │ color = edge type)      │
│               │ cache layer       │                         │
│ α.1.4 Redis   │ (Redis storage    │                         │
│ activation    │ of node heat,     │                         │
│ cache setup   │ fast read/write   │                         │
│ (key schema,  │ during cascade)   │                         │
│ TTL config)   │                   │                         │
│               │ β.1.5 Retrieval   │                         │
│ α.1.5 Content │ API (query text   │                         │
│ ingestion     │ → seed nodes →    │                         │
│ endpoint      │ activate →        │                         │
│ (accept raw   │ return ranked     │                         │
│ text/JSON,    │ nodes)            │                         │
│ queue for     │                   │                         │
│ embedding)    │                   │                         │
│               │                   │                         │
├───────────────┴───────────────────┴─────────────────────────┤
│ GATE: Paste text → system creates node → connects to graph  │
│ → query the graph → see spreading activation → get ranked   │
│ nodes back. Visible in frontend graph view.                 │
└─────────────────────────────────────────────────────────────┘
```

**Dependencies:** Phase 0 complete
**Deliverable:** Working graph with ingest, connect, query, and visualize

---

## Phase 2: Ingestion Pipeline
### Duration: 2 weeks
### Goal: Real social data flows into the graph automatically. Niche registers exist.

```
┌─────────────────────────────────────────────────────────────┐
│ PHASE 2 — INGESTION PIPELINE                                │
├───────────────┬───────────────────┬─────────────────────────┤
│ AGENT α       │ AGENT β           │ AGENT γ                 │
├───────────────┼───────────────────┼─────────────────────────┤
│               │                   │                         │
│ α.2.1 Twitter │ β.2.1 Community   │ γ.2.1 Data source       │
│ API v2        │ detection model   │ management page         │
│ integration   │ (classify content │ (list connected         │
│ (OAuth,       │ into niches       │ sources, status,        │
│ polling,      │ from text,        │ ingestion rates)        │
│ rate limits)  │ hashtags,         │                         │
│               │ posting history)  │ γ.2.2 Niche register    │
│ α.2.2 Reddit  │                   │ dashboard (list all     │
│ API           │ β.2.2 Niche       │ registers, reliability  │
│ integration   │ Register data     │ %, validator count,     │
│ (subreddit    │ model + storage   │ slang dictionary        │
│ monitoring,   │ (slang dict,      │ viewer)                 │
│ comment       │ sarcasm baseline, │                         │
│ crawling)     │ emoji semantics,  │ γ.2.3 Real-time         │
│               │ per-register)     │ ingestion feed          │
│ α.2.3 Kafka   │                   │ (streaming view of      │
│ event stream  │ β.2.3 Sentiment   │ new nodes entering      │
│ setup (topic  │ analysis with     │ the graph, classified   │
│ per source,   │ niche register    │ by niche + sentiment)   │
│ consumer      │ lookup (if        │                         │
│ groups,       │ register exists   │ γ.2.4 Source             │
│ serialization)│ → use it, else    │ connection wizard       │
│               │ → generic +       │ (OAuth flows for        │
│ α.2.4 Node    │ cache fallback)   │ Twitter, Reddit,        │
│ Factory       │                   │ future platforms)       │
│ service       │ β.2.4 Entity      │                         │
│ (raw social   │ extraction        │                         │
│ data → typed  │ (brands, people,  │                         │
│ MyceliumNode  │ products, slang,  │                         │
│ with correct  │ hashtags →        │                         │
│ node_type)    │ ENTITY nodes      │                         │
│               │ + CAUSAL edges)   │                         │
│ α.2.5 Rate    │                   │                         │
│ limiter +     │ β.2.5 Typed       │                         │
│ deduplication │ node classifier   │                         │
│ service       │ (SentimentSignal  │                         │
│ (content hash │ vs FandomSignal   │                         │
│ → skip if     │ vs UGCSignal      │                         │
│ seen)         │ classification)   │                         │
│               │                   │                         │
├───────────────┴───────────────────┴─────────────────────────┤
│ GATE: Connect Twitter/Reddit → data flows automatically →   │
│ nodes created with correct types → niche detected →         │
│ sentiment scored via niche register → visible in dashboard. │
└─────────────────────────────────────────────────────────────┘
```

**Dependencies:** Phase 1 (graph exists to ingest into)
**Deliverable:** Live social data flowing into graph, niche-calibrated sentiment

---

## Phase 3: Content Generation + Simulated Scoring
### Duration: 2 weeks
### Goal: Client inputs a brief → system generates content with predicted engagement scores.

```
┌─────────────────────────────────────────────────────────────┐
│ PHASE 3 — CONTENT GENERATION + SCORING                      │
├───────────────┬───────────────────┬─────────────────────────┤
│ AGENT α       │ AGENT β           │ AGENT γ                 │
├───────────────┼───────────────────┼─────────────────────────┤
│               │                   │                         │
│ α.3.1 LLM     │ β.3.1 Context     │ γ.3.1 Brief intake     │
│ proxy service │ assembly algo     │ form (client inputs:    │
│ (LiteLLM      │ (take activated   │ brand, audience,        │
│ wrapper,      │ subgraph →        │ platform, tone,         │
│ model         │ select nodes →    │ objectives, budget)     │
│ routing,      │ order by          │                         │
│ cost          │ relevance →       │ γ.3.2 Generated         │
│ tracking)     │ format as LLM     │ content review page     │
│               │ context)          │ (show all concepts      │
│ α.3.2 Content │                   │ with scores, risk       │
│ generation    │ β.3.2 Scoring     │ factors, confidence     │
│ API endpoint  │ prompt design     │ intervals)              │
│ (POST /gen    │ (system prompt    │                         │
│ with brief →  │ that includes     │ γ.3.3 Score card        │
│ returns       │ cultural context, │ component (animated     │
│ concepts +    │ brand voice,      │ bars for engagement     │
│ scores)       │ niche register    │ prediction,             │
│               │ data, format      │ confidence interval     │
│ α.3.3 Content │ templates)        │ visualization,          │
│ storage model │                   │ risk badges)            │
│ (Generated    │ β.3.3 Engagement  │                         │
│ Content       │ Simulator v1     │ γ.3.4 Concept           │
│ nodes with    │ (Bayesian model   │ comparison view         │
│ lineage       │ — initial: logist │ (side-by-side scored    │
│ tracking)     │ regression with   │ concepts, sortable      │
│               │ uncertainty,      │ by score/confidence/    │
│ α.3.4 Brief   │ features:         │ risk)                   │
│ template      │ format, audience, │                         │
│ system        │ platform, timing, │ γ.3.5 Cultural          │
│ (saveable,    │ niche register    │ intelligence feed       │
│ reusable      │ reliability)      │ (trending moments,      │
│ brief         │                   │ sentiment shifts,       │
│ configs per   │ β.3.4 Risk        │ niche activity —        │
│ client)       │ scoring model     │ live dashboard)         │
│               │ (brand safety     │                         │
│               │ flags: competitor │                         │
│               │ mentions,         │                         │
│               │ controversial     │                         │
│               │ topics,           │                         │
│               │ platform TOS)     │                         │
│               │                   │                         │
│               │ β.3.5 Format      │                         │
│               │ fatigue tracker   │                         │
│               │ (monitor how      │                         │
│               │ "tired" each      │                         │
│               │ content format    │                         │
│               │ is per niche)     │                         │
│               │                   │                         │
├───────────────┴───────────────────┴─────────────────────────┤
│ GATE: Input brief → system activates graph → assembles      │
│ context → generates 5 concepts → each scored with           │
│ engagement prediction + confidence interval + risk flags.   │
│ This is the MVP demo moment.                                │
└─────────────────────────────────────────────────────────────┘
```

**Dependencies:** Phase 1 (graph retrieval), Phase 2 (real data in graph)
**Deliverable:** End-to-end brief → content → score pipeline. **This is your sellable MVP.**

---

## Phase 4: Feedback Loop + Graph Learning
### Duration: 2 weeks
### Goal: Deployed content results feed back into the graph. Edges strengthen/weaken. Predictions improve.

```
┌─────────────────────────────────────────────────────────────┐
│ PHASE 4 — FEEDBACK LOOP                                     │
├───────────────┬───────────────────┬─────────────────────────┤
│ AGENT α       │ AGENT β           │ AGENT γ                 │
├───────────────┼───────────────────┼─────────────────────────┤
│               │                   │                         │
│ α.4.1 Feedback│ β.4.1 Reward      │ γ.4.1 Campaign          │
│ ingestion API │ computation       │ deployment tracker      │
│ (POST actual  │ engine (multi-    │ (mark content as        │
│ engagement    │ objective:        │ deployed, input          │
│ metrics after │ engagement vs     │ platform + URL)         │
│ deployment)   │ baseline,         │                         │
│               │ sentiment of      │ γ.4.2 Predicted vs      │
│ α.4.2 Eng-    │ reactions,        │ actual dashboard        │
│ agement       │ cost efficiency,  │ (show predicted score   │
│ collection    │ brand safety,     │ next to actual           │
│ service       │ simulation        │ engagement, delta,       │
│ (auto-pull    │ accuracy)         │ trend over time)         │
│ from platform │                   │                         │
│ APIs at 24h,  │ β.4.2 Hebbian     │ γ.4.3 Graph evolution   │
│ 48h, 7d       │ Bridge            │ timeline (show how      │
│ windows)      │ implementation    │ edge weights changed     │
│               │ (reward signal    │ after each feedback      │
│ α.4.3 Decay   │ → traverse path   │ cycle, animated)        │
│ service       │ → update edge     │                         │
│ (Celery beat  │ weights →         │ γ.4.4 Accuracy           │
│ hourly job:   │ create co-        │ tracking page           │
│ decay unused  │ retrieval edges)  │ (system-wide             │
│ edges,        │                   │ prediction accuracy     │
│ prune below   │ β.4.3 Decay       │ over time, per-niche    │
│ threshold)    │ rate calibration  │ breakdown)              │
│               │ (per node_type    │                         │
│ α.4.4 Perf-   │ decay rates:      │                         │
│ ormance       │ sentiment fast,   │                         │
│ Feedback      │ fandom slow,      │                         │
│ edge creation │ audience near-    │                         │
│ service       │ permanent)        │                         │
│ (link content │                   │                         │
│ nodes to      │ β.4.4 Bayesian    │                         │
│ reaction      │ posterior         │                         │
│ sentiment     │ updates (update   │                         │
│ nodes)        │ engagement        │                         │
│               │ simulator with    │                         │
│               │ new actual vs     │                         │
│               │ predicted data)   │                         │
│               │                   │                         │
├───────────────┴───────────────────┴─────────────────────────┤
│ GATE: Deploy content → engagement collected automatically → │
│ reward computed → edges reinforced/decayed → Bayesian model │
│ updated → next generation's predictions are measurably      │
│ better. The system is now learning.                         │
└─────────────────────────────────────────────────────────────┘
```

**Dependencies:** Phase 3 (content exists to deploy and measure)
**Deliverable:** Closed feedback loop. The graph is now alive and learning.

---

## Phase 5: Social Curation Engineer System
### Duration: 2 weeks
### Goal: Humans can validate niche registers, resolve ambiguity, and earn tokens.

```
┌─────────────────────────────────────────────────────────────┐
│ PHASE 5 — SCE SYSTEM                                        │
├───────────────┬───────────────────┬─────────────────────────┤
│ AGENT α       │ AGENT β           │ AGENT γ                 │
├───────────────┼───────────────────┼─────────────────────────┤
│               │                   │                         │
│ α.5.1 SCE     │ β.5.1 Task        │ γ.5.1 SCE dashboard     │
│ user model    │ generation        │ (queue view with        │
│ (profile,     │ engine (auto-     │ urgency levels,         │
│ level, XP,    │ generate          │ task cards,             │
│ niche         │ validation tasks  │ decision inputs)        │
│ verifications,│ from register     │                         │
│ badges,       │ gaps, new slang,  │ γ.5.2 Niche             │
│ earnings      │ low-confidence    │ verification quiz       │
│ history)      │ entries)          │ (10-question auto-      │
│               │                   │ generated quiz per      │
│ α.5.2 Task    │ β.5.2 Honeypot    │ niche, SCE must pass    │
│ queue service │ injection (known- │ to curate)              │
│ (priority     │ answer tasks      │                         │
│ queue, assign │ mixed into the    │ γ.5.3 Leveling &        │
│ to SCEs based │ queue at 10%      │ badge display           │
│ on level +    │ rate, track       │ (XP bar, level          │
│ niche match)  │ accuracy)         │ indicator, badge        │
│               │                   │ collection,             │
│ α.5.3 Cross-  │ β.5.3 Consensus   │ specialist badges)      │
│ validation    │ escalation algo   │                         │
│ service       │ (disagreement     │ γ.5.4 SCE earnings      │
│ (compare SCE  │ detected → ask    │ page (daily/weekly/     │
│ decisions     │ more validators   │ monthly SPORE earned,   │
│ against each  │ → if still no     │ multiplier breakdown,   │
│ other,        │ consensus →       │ accuracy stats)         │
│ compute       │ split into sub-   │                         │
│ agreement     │ registers, hold   │ γ.5.5 SCE recruitment   │
│ scores)       │ multiple states)  │ flow (detection of      │
│               │                   │ niche expertise in      │
│ α.5.4 Earning │ β.5.4 Register    │ social profiles →       │
│ calculation   │ reliability       │ targeted invitation     │
│ service       │ score computation │ → onboarding wizard)    │
│ (base rate ×  │ (f(validators,    │                         │
│ level ×       │ agreement,        │                         │
│ founding ×    │ recency,          │                         │
│ accuracy ×    │ coverage) →       │                         │
│ niche         │ percentage per    │                         │
│ verification) │ register)         │                         │
│               │                   │                         │
│ α.5.5 Token   │ β.5.5 Sub-        │                         │
│ ledger        │ register          │                         │
│ service       │ creation logic    │                         │
│ (internal     │ (when validators  │                         │
│ accounting,   │ can't agree →     │                         │
│ vesting       │ create parallel   │                         │
│ schedule,     │ registers →       │                         │
│ withdrawal    │ context-based     │                         │
│ friction)     │ selection at      │                         │
│               │ inference time)   │                         │
│               │                   │                         │
├───────────────┴───────────────────┴─────────────────────────┤
│ GATE: SCE signs up → verifies niche expertise → receives    │
│ tasks → validates slang/sarcasm/edges → earns SPORE →       │
│ register reliability improves → disagreements trigger        │
│ escalation or sub-register creation. Honeypots catch spam.  │
└─────────────────────────────────────────────────────────────┘
```

**Dependencies:** Phase 2 (niche registers exist), Phase 4 (feedback loop for accuracy tracking)
**Deliverable:** Human-in-the-loop curation system with tokenized compensation

---

## Phase 6: Shortest Path + Play Tester
### Duration: 2 weeks
### Goal: System routes decisions to humans when that's faster than compute. Highway edges form.

```
┌─────────────────────────────────────────────────────────────┐
│ PHASE 6 — SHORTEST PATH + PLAY TESTER                       │
├───────────────┬───────────────────┬─────────────────────────┤
│ AGENT α       │ AGENT β           │ AGENT γ                 │
├───────────────┼───────────────────┼─────────────────────────┤
│               │                   │                         │
│ α.6.1 Human   │ β.6.1 Path cost   │ γ.6.1 Play Tester       │
│ node service  │ function          │ queue (unified          │
│ (model the    │ (edge_cost =      │ decision interface —    │
│ Play Tester   │ 1/weight ×        │ urgent/standard/        │
│ as a graph    │ staleness ×       │ background sections)    │
│ node with     │ activation_cost,  │                         │
│ dynamic cost  │ Dijkstra/A*       │ γ.6.2 Decision input    │
│ based on      │ pathfinding)      │ components (binary      │
│ queue length  │                   │ choice, multi-option,   │
│ + response    │ β.6.2 Highway     │ rating scale, text      │
│ time)         │ edge detection    │ annotation — one UX     │
│               │ (frequent paths   │ per decision type)      │
│ α.6.2 Decision│ → create direct   │                         │
│ routing       │ shortcut edges,   │ γ.6.3 Play Tester       │
│ service       │ bypass            │ stats page (decisions   │
│ (compute:     │ intermediate      │ today, accuracy rate,   │
│ human cost    │ hops)             │ level progress,         │
│ vs compute    │                   │ highest-impact          │
│ cost →        │ β.6.3 Answer      │ decision this week)     │
│ route to      │ cache system      │                         │
│ cheapest)     │ (precomputed      │ γ.6.4 Evidence          │
│               │ results for       │ presentation panels     │
│ α.6.3 Decision│ common query      │ (when routing to        │
│ outcome       │ patterns,         │ human, show relevant    │
│ tracking      │ invalidated       │ graph data, competing   │
│ (was the      │ when edge         │ options, context —      │
│ human right?  │ weights shift     │ not raw data dumps)     │
│ track for     │ beyond            │                         │
│ leveling +    │ threshold)        │                         │
│ accuracy)     │                   │                         │
│               │ β.6.4 Path        │                         │
│               │ efficiency        │                         │
│               │ reward signal     │                         │
│               │ (retrospective    │                         │
│               │ optimal path      │                         │
│               │ computation →     │                         │
│               │ compare to        │                         │
│               │ actual path →     │                         │
│               │ reward/penalize)  │                         │
│               │                   │                         │
├───────────────┴───────────────────┴─────────────────────────┤
│ GATE: System detects "human is faster" → routes decision →  │
│ Play Tester decides → outcome tracked → highway edges form  │
│ → common queries get cached shortcuts → graph optimizes     │
│ for speed over time.                                        │
└─────────────────────────────────────────────────────────────┘
```

**Dependencies:** Phase 4 (feedback loop), Phase 5 (SCE system provides human pool)
**Deliverable:** Self-optimizing shortest-path system with human routing

---

## Phase 7: Multi-State Truth Resolution
### Duration: 2 weeks
### Goal: System can hold competing realities and resolve via consensus.

```
┌─────────────────────────────────────────────────────────────┐
│ PHASE 7 — MULTI-STATE TRUTH RESOLUTION                      │
├───────────────┬───────────────────┬─────────────────────────┤
│ AGENT α       │ AGENT β           │ AGENT γ                 │
├───────────────┼───────────────────┼─────────────────────────┤
│               │                   │                         │
│ α.7.1 State   │ β.7.1 Changepoint │ γ.7.1 Multi-state       │
│ registry      │ detection model   │ visualization           │
│ service       │ (Bayesian         │ (show competing         │
│ (CRUD for     │ changepoint on    │ states, their           │
│ parallel      │ engagement        │ probabilities,          │
│ states, each  │ distributions     │ evidence for each)      │
│ with own edge │ per platform ×    │                         │
│ weight        │ niche)            │ γ.7.2 Consensus         │
│ snapshot)     │                   │ progress indicator      │
│               │ β.7.2 Judge       │ (5 judges, their        │
│ α.7.2 Lazy    │ panel impl:       │ votes, weighted         │
│ fork service  │ - Judge 1:        │ consensus score,        │
│ (fork only    │   Bayesian model  │ countdown to force-     │
│ affected      │ - Judge 2: cross- │ commit)                 │
│ subgraph,     │   niche check     │                         │
│ not entire    │ - Judge 3:        │ γ.7.3 State commit      │
│ graph)        │   prediction      │ notification            │
│               │   accuracy test   │ (when truth resolves,   │
│ α.7.3 State   │ - Judge 4:        │ notify affected         │
│ commit/       │   temporal match  │ clients: "Algorithm     │
│ merge service │ - Judge 5:        │ shift confirmed.        │
│ (winning      │   human (SCE/     │ Your predictions have   │
│ state edge    │   Play Tester)    │ been recalibrated.")    │
│ weights →     │                   │                         │
│ main graph,   │ β.7.3 Consensus   │ γ.7.4 Historical        │
│ losing states │ mechanism         │ state resolution log    │
│ discarded,    │ (weighted voting, │ (past events: what      │
│ audit trail)  │ confidence        │ was detected, how it    │
│               │ threshold,        │ resolved, accuracy)     │
│ α.7.4 State   │ 14-day max hold,  │                         │
│ snapshot      │ progressive       │                         │
│ scheduler     │ pruning 4→2→1)    │                         │
│ (hourly       │                   │                         │
│ snapshots     │ β.7.4 Conservative│                         │
│ for rollback  │ prediction during │                         │
│ capability)   │ uncertainty       │                         │
│               │ (widen confidence │                         │
│               │ intervals while   │                         │
│               │ multi-state       │                         │
│               │ active)           │                         │
│               │                   │                         │
├───────────────┴───────────────────┴─────────────────────────┤
│ GATE: System detects engagement distribution shift →        │
│ creates 2-4 competing states → 5 judges vote over time →    │
│ consensus reached → winning state merged → clients notified │
│ → predictions recalibrated. System never over-reacts.       │
└─────────────────────────────────────────────────────────────┘
```

**Dependencies:** Phase 4 (feedback loop provides engagement data), Phase 6 (Play Tester as Judge 5)
**Deliverable:** Resilient system that handles platform algorithm shifts gracefully

---

## Phase 8: RL Training Engine
### Duration: 3 weeks
### Goal: Context selection becomes a learned policy, not a heuristic.

```
┌─────────────────────────────────────────────────────────────┐
│ PHASE 8 — RL TRAINING ENGINE                                │
├───────────────┬───────────────────┬─────────────────────────┤
│ AGENT α       │ AGENT β           │ AGENT γ                 │
├───────────────┼───────────────────┼─────────────────────────┤
│               │                   │                         │
│ α.8.1 Traject-│ β.8.1 MDP state   │ γ.8.1 RL performance    │
│ ory storage   │ encoder (graph    │ dashboard (reward       │
│ (Kafka topic  │ subgraph + query  │ trends per objective,   │
│ for full      │ + Bayesian        │ policy entropy,         │
│ trajectories: │ signals →         │ context tokens used,    │
│ query → hops  │ fixed-size        │ trajectory length)      │
│ → selections  │ state vector)     │                         │
│ → response →  │                   │ γ.8.2 A/B testing       │
│ feedback)     │ β.8.2 Action      │ framework (heuristic    │
│               │ space impl        │ retrieval vs RL policy  │
│ α.8.2 Replay  │ (SELECT, EXPLORE, │ comparison, per-query   │
│ buffer        │ STOP, DEPRI-      │ toggle)                 │
│ service       │ ORITISE as        │                         │
│ (prioritized  │ discrete actions  │ γ.8.3 Context           │
│ experience    │ over candidate    │ inspector (for any      │
│ replay,       │ nodes/edges)      │ generated content,      │
│ configurable  │                   │ show which nodes        │
│ buffer size,  │ β.8.3 PPO         │ were selected, which    │
│ sampling)     │ training loop     │ were skipped, and       │
│               │ (Ray RLlib,       │ why — path              │
│ α.8.3 Model   │ batch updates     │ visualization)          │
│ versioning    │ every N           │                         │
│ service       │ trajectories,     │ γ.8.4 Cold start        │
│ (checkpoint   │ configurable      │ progress indicator      │
│ storage,      │ hyperparameters)  │ (what phase: imitation  │
│ rollback,     │                   │ → guided → autonomous,  │
│ A/B model     │ β.8.4 Hebbian     │ how many trajectories   │
│ selection)    │ Bridge v2         │ collected, when RL      │
│               │ (unified: RL      │ will take over)         │
│ α.8.4 Train-  │ reward → edge     │                         │
│ ing scheduler │ update +          │                         │
│ (batch        │ co-retrieval      │                         │
│ training      │ edge creation,    │                         │
│ during off-   │ now also feeds    │                         │
│ peak hours,   │ path efficiency   │                         │
│ GPU resource  │ signal)           │                         │
│ management)   │                   │                         │
│               │ β.8.5 Cold start  │                         │
│               │ pipeline          │                         │
│               │ (behavioral       │                         │
│               │ cloning → guided  │                         │
│               │ exploration →     │                         │
│               │ autonomous)       │                         │
│               │                   │                         │
│               │ β.8.6 Path        │                         │
│               │ efficiency        │                         │
│               │ reward v2         │                         │
│               │ (integrated       │                         │
│               │ with multi-       │                         │
│               │ objective         │                         │
│               │ reward: relevance │                         │
│               │ + cost + satis-   │                         │
│               │ faction +         │                         │
│               │ accuracy + path)  │                         │
│               │                   │                         │
├───────────────┴───────────────────┴─────────────────────────┤
│ GATE: RL agent trained → outperforms heuristic retriever    │
│ on held-out queries → A/B shows measurable improvement →    │
│ gradual rollout from 10% to 100% of traffic.                │
└─────────────────────────────────────────────────────────────┘
```

**Dependencies:** Phase 4 (trajectories need feedback), Phase 6 (path efficiency signal)
**Deliverable:** Learned retrieval policy that measurably outperforms heuristics

---

## Phase 9: Source Discovery
### Duration: 2 weeks
### Goal: System discovers new data sources automatically.

```
┌─────────────────────────────────────────────────────────────┐
│ PHASE 9 — SOURCE DISCOVERY                                  │
├───────────────┬───────────────────┬─────────────────────────┤
│ AGENT α       │ AGENT β           │ AGENT γ                 │
├───────────────┼───────────────────┼─────────────────────────┤
│               │                   │                         │
│ α.9.1 Scraping│ β.9.1 Edge-based  │ γ.9.1 Discovery         │
│ orchestrator  │ exploration       │ recommendations         │
│ (Scrapy +     │ (strengthening    │ page (suggested         │
│ Playwright,   │ CROSSOVER edge →  │ sources with            │
│ configurable  │ identify          │ rationale, expected     │
│ per-source    │ unscraped         │ value, one-click        │
│ scrapers,     │ communities on    │ approve/reject)         │
│ error         │ the other end)    │                         │
│ handling)     │                   │ γ.9.2 Source             │
│               │ β.9.2 Thompson    │ performance tracker     │
│ α.9.2 Scraping│ Sampling over     │ (after activation:      │
│ Target model  │ unexplored        │ how many signals        │
│ (url pattern, │ sources           │ produced, quality       │
│ priority,     │ (Beta(α,β) per    │ score, cost,            │
│ schedule,     │ candidate,        │ recommendation to       │
│ status,       │ explore highest   │ increase/decrease       │
│ performance   │ sampled           │ priority)               │
│ history)      │ probability)      │                         │
│               │                   │ γ.9.3 Competitive       │
│ α.9.3 Source  │ β.9.3 Performance │ signal monitor          │
│ health        │ backtracking      │ (track competitor       │
│ monitoring    │ (successful       │ content → reverse-      │
│ (uptime,      │ content → trace   │ engineer cultural       │
│ rate limits,  │ backward through  │ references →            │
│ data quality  │ graph → identify  │ surface as discovery    │
│ checks)       │ upstream sources  │ leads)                  │
│               │ → discover        │                         │
│               │ adjacent sources  │                         │
│               │ not yet scraped)  │                         │
│               │                   │                         │
│               │ β.9.4 Source       │                         │
│               │ value model       │                         │
│               │ (Bayesian:        │                         │
│               │ P(valuable        │                         │
│               │ signals | source  │                         │
│               │ features) →       │                         │
│               │ priority          │                         │
│               │ ranking)          │                         │
│               │                   │                         │
├───────────────┴───────────────────┴─────────────────────────┤
│ GATE: System identifies new source candidates automatically │
│ → Thompson Sampling explores them → valuable sources get    │
│ promoted → low-value sources deprioritized. The scraping    │
│ network grows organically like mycelium.                    │
└─────────────────────────────────────────────────────────────┘
```

**Dependencies:** Phase 2 (ingestion pipeline), Phase 4 (feedback for backtracking)
**Deliverable:** Self-expanding data collection network

---

## Phase 10: Token Economics + airdrop.works Integration
### Duration: 3 weeks
### Goal: Token economy live. airdrop.works drives acquisition. Tiers gate access.

```
┌─────────────────────────────────────────────────────────────┐
│ PHASE 10 — TOKEN ECONOMICS + GTM                            │
├───────────────┬───────────────────┬─────────────────────────┤
│ AGENT α       │ AGENT β           │ AGENT γ                 │
├───────────────┼───────────────────┼─────────────────────────┤
│               │                   │                         │
│ α.10.1 Token  │ β.10.1 Emission   │ γ.10.1 airdrop.works    │
│ ledger        │ trigger engine    │ campaign page           │
│ service v2    │ (monitor system   │ (onboarding tasks,      │
│ (vesting      │ for value events  │ progress tracker,       │
│ schedules,    │ → compute token   │ token earnings          │
│ contribution  │ emission amount   │ display)                │
│ multiplier    │ → apply multi-    │                         │
│ computation,  │ pliers → credit   │ γ.10.2 Tier access      │
│ extraction    │ to ledger)        │ gating UI (show         │
│ friction)     │                   │ current tier,           │
│               │ β.10.2 Quality    │ features available,     │
│ α.10.2 Tier   │ vesting           │ upgrade path,           │
│ access        │ algorithm         │ tokens needed)          │
│ control       │ (70% vests over   │                         │
│ middleware    │ 90 days,          │ γ.10.3 Token             │
│ (check token  │ acceleration      │ dashboard (balance,     │
│ balance →     │ based on          │ vesting schedule,       │
│ gate API      │ subsequent        │ multiplier breakdown,   │
│ access per    │ contribution      │ earning history,        │
│ tier)         │ quality scores)   │ withdrawal status)      │
│               │                   │                         │
│ α.10.3 Relia- │ β.10.3 Founding   │ γ.10.4 Founding         │
│ bility gating │ curator tracker   │ curator status          │
│ service       │ (first 1000       │ display (in SCE         │
│ (register     │ niches, assign    │ dashboard: founding     │
│ reliability   │ founding status,  │ badge, niche count      │
│ % → check     │ track activity    │ remaining out of        │
│ against tier  │ requirement for   │ 1000, permanent         │
│ threshold →   │ bonus to remain   │ multiplier active/      │
│ serve or      │ active)           │ paused)                 │
│ fallback to   │                   │                         │
│ cache)        │ β.10.4 Anti-      │ γ.10.5 Referral         │
│               │ mercenary         │ system (share link      │
│ α.10.4 Peer   │ detection         │ → track signups →       │
│ transfer      │ (behavioral       │ earn tokens for         │
│ service       │ patterns:         │ conversions)            │
│ (user→user    │ rapid withdrawal, │                         │
│ token         │ low quality       │ γ.10.6 Confidence       │
│ transfers,    │ submissions,      │ interval display        │
│ audit trail)  │ multi-accounting  │ per tier (free:         │
│               │ → flag +          │ wide + warning,         │
│               │ restrict)         │ enterprise: tight       │
│               │                   │ + brand safety)         │
│               │                   │                         │
├───────────────┴───────────────────┴─────────────────────────┤
│ GATE: Tokens emit on contribution → vest based on quality → │
│ tiers gate access based on balance → airdrop.works drives   │
│ acquisition → reliability thresholds per tier enforced.      │
│ The economy is functioning.                                 │
└─────────────────────────────────────────────────────────────┘
```

**Dependencies:** Phase 5 (SCE system for earning), Phase 3 (content gen for tier gating)
**Deliverable:** Live token economy with anti-mercenary protections and GTM flywheel

---

## Phase 11: Advanced Bayesian Models
### Duration: 2 weeks
### Goal: All four specialized Bayesian models operational.

```
┌─────────────────────────────────────────────────────────────┐
│ PHASE 11 — ADVANCED BAYESIAN MODELS                         │
├───────────────┬───────────────────┬─────────────────────────┤
│ AGENT α       │ AGENT β           │ AGENT γ                 │
├───────────────┼───────────────────┼─────────────────────────┤
│               │                   │                         │
│ α.11.1 Model  │ β.11.1 Cultural   │ γ.11.1 Lifecycle        │
│ Registry      │ Lifecycle Model   │ visualization           │
│ service       │ (HMM: underground │ (trend lifecycle        │
│ (register,    │ → emerging →      │ tracker with stage      │
│ train,        │ mainstream →      │ indicator, predicted    │
│ query,        │ saturated → dead, │ transitions,            │
│ retire models │ Bayesian          │ confidence)             │
│ via API)      │ transition        │                         │
│               │ matrices)         │ γ.11.2 Algorithm        │
│ α.11.2 Post-  │                   │ shift alert page        │
│ erior store   │ β.11.2 Algorithm  │ (detected shifts,       │
│ (TimescaleDB  │ Shift Detector    │ affected niches,        │
│ schema for    │ (Bayesian         │ recommended             │
│ model params, │ changepoint on    │ adjustments)            │
│ evidence      │ per-platform ×    │                         │
│ logs,         │ per-niche         │ γ.11.3 Brand safety     │
│ versioning)   │ engagement        │ report (per-concept     │
│               │ distributions)    │ risk breakdown with     │
│ α.11.3 Model  │                   │ specific risk           │
│ serving       │ β.11.3 Brand      │ factors, historical     │
│ layer (cache  │ Safety Risk Model │ incident comparisons)   │
│ predictions,  │ (Bayesian LogReg  │                         │
│ batch         │ with informative  │ γ.11.4 Demand           │
│ inference     │ priors per risk   │ forecaster dashboard    │
│ for cost      │ factor category)  │ (predicted hot zones    │
│ efficiency)   │                   │ for next 24h/7d,        │
│               │ β.11.4 Demand     │ caching status)         │
│               │ Forecaster        │                         │
│               │ (Gaussian         │                         │
│               │ Process over      │                         │
│               │ temporal features │                         │
│               │ → predictive      │                         │
│               │ caching of        │                         │
│               │ subgraphs)        │                         │
│               │                   │                         │
├───────────────┴───────────────────┴─────────────────────────┤
│ GATE: All 4 Bayesian models operational → lifecycle stages  │
│ auto-tracked → algorithm shifts detected → brand safety     │
│ scored per concept → hot zones pre-cached.                  │
└─────────────────────────────────────────────────────────────┘
```

**Dependencies:** Phase 4 (feedback data for training), Phase 7 (changepoint feeds multi-state)
**Deliverable:** Full probabilistic intelligence layer

---

## Phase Summary

```
TIMELINE (estimated):

Phase  Duration  Weeks    Description                        MVP?
─────  ────────  ──────   ─────────────────────────────────  ────
  0    1 week    W1       Foundation                         
  1    2 weeks   W2-3     Core Graph                         
  2    2 weeks   W4-5     Ingestion Pipeline                 
  3    2 weeks   W6-7     Content Gen + Scoring              ← MVP
  4    2 weeks   W8-9     Feedback Loop                      ← Learning MVP
  5    2 weeks   W10-11   SCE System                         
  6    2 weeks   W12-13   Shortest Path + Play Tester        
  7    2 weeks   W14-15   Multi-State Truth Resolution       
  8    3 weeks   W16-18   RL Training Engine                 
  9    2 weeks   W19-20   Source Discovery                   
  10   3 weeks   W21-23   Token Economics + airdrop.works    
  11   2 weeks   W24-25   Advanced Bayesian Models           

TOTAL: ~25 weeks (6 months) with 3 concurrent agents

CRITICAL PATH:
Phase 0 → Phase 1 → Phase 2 → Phase 3 (MVP at week 7)
                                  ↓
                              Phase 4 → Phase 5 → Phase 6
                                  ↓         ↓
                              Phase 7   Phase 10
                                  ↓
                              Phase 8
                                  ↓
                              Phase 9 + Phase 11
```

---

## Task Count Summary

```
           α (Infra)    β (ML)     γ (Frontend)    Total
Phase 0:      4           3            4             11
Phase 1:      5           5            4             14
Phase 2:      5           5            4             14
Phase 3:      4           5            5             14
Phase 4:      4           4            4             12
Phase 5:      5           5            5             15
Phase 6:      3           4            4             11
Phase 7:      4           4            4             12
Phase 8:      4           6            4             14
Phase 9:      3           4            3             10
Phase 10:     4           4            6             14
Phase 11:     3           4            4             11
─────────────────────────────────────────────────────────
TOTAL:       48          53           51            152
```

152 discrete tasks across 11 phases, parallelized across 3 agents.
Average: ~14 tasks per phase, ~5 per agent per phase.
