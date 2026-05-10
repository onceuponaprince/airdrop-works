# Phase 1 Implementation Handoff Brief

**Date:** May 10, 2026  
**Project:** airdrop-works  
**Duration:** May 11–13, 2026 (3 days)  
**Objective:** Implement 9 functions across 3 rounds with parallel teams + merge gates  
**Status:** Ready to implement

---

## What You're Building

**9 functions, 3 rounds, 1 deadline: May 13, 23:59 UTC**

- **Round 1 (May 11):** Wallet UX stabilization + API foundation (6–8h)
- **Round 2 (May 12):** Admin dashboard components + backend visibility (6–8h)
- **Round 3 (May 13):** Scoring UX + performance optimization (6–8h)

**Total effort:** ~18–24 hours of focused development

---

## Getting Started

### Step 1: Clone/Navigate to Repo

```bash
cd /home/onceuponaprince/code/airdrop-works
```

### Step 2: Read the 3 Specification Documents (In Order)

1. **CODEBASE_AUDIT.md** — Current state, blockers, what works
2. **PHASE_1_FUNCTION_SPECS.md** — Exact 9 function specifications (signatures, validation, permissions)
3. **PHASE_1_PARALLEL_EXECUTION_PLAN.md** — How to execute in 3 rounds with merge gates

**Read time:** ~20 minutes total. Do NOT skip this.

### Step 3: Verify Local Environment

```bash
# Frontend
cd frontend
pnpm install --frozen-lockfile

# Backend
cd ../backend
uv sync

# Both should complete without errors
```

### Step 4: Understand Tech Stack

- **Frontend:** Next.js 16.2.1, React 19, TypeScript strict, Tailwind, Framer Motion, Zustand
- **Backend:** Django 5.0, DRF 3.15, Celery 5.3, PostgreSQL, Redis
- **Web3:** Particle Network ConnectKit (alpha), wagmi, viem, SIWE
- **AI:** Anthropic Claude SDK (already integrated)
- **Infrastructure:** Docker Compose (ready to test locally)

---

## The 9 Functions (Quick Reference)

| # | Function | File | Type | Est. Time |
|---|----------|------|------|-----------|
| 1 | handleWalletError | ParticleWalletBridge.tsx | Frontend | 1–2h |
| 2 | getFallbackWalletConnectors | ParticleWalletBridge.tsx | Frontend | 1–2h |
| 3 | useAiJudge (enhanced) | useAiJudge.ts | Frontend Hook | 2–3h |
| 4 | CampaignRubricForm | CampaignRubricForm.tsx | React Component | 2–3h |
| 5 | RubricViewSet | judge/views.py | DRF ViewSet | 1–2h |
| 6 | CampaignViewSet | quests/views.py | DRF ViewSet | 2–3h |
| 7 | ContributionAdminViewSet | contributions/views.py | DRF ViewSet | 1–2h |
| 8 | admin_stats | admin/views.py | API Endpoint | 1–2h |
| 9 | leaderboard get_queryset | leaderboard/views.py | Optimization | 0.5–1h |

---

## Round 1: May 11 (Critical Foundations)

**Implement Functions 1, 2, 5, 6**

### Functions 1 & 2: Wallet Error Handling + Fallbacks
- **File:** `frontend/src/providers/ParticleWalletBridge.tsx`
- **What:** Two functions to make wallet UX user-friendly
- **Time:** 2–3 hours
- **Tests needed:** Error message mapping, connector order
- **Verify:** `pnpm lint && pnpm build`

### Function 5: Rubric CRUD API
- **File:** `backend/apps/judge/views.py` (+ serializers.py, urls.py)
- **What:** DRF viewset for campaign scoring rubrics
- **Time:** 1–2 hours
- **Tests needed:** Public GET, admin POST/PUT/DELETE, validation
- **Verify:** `pytest backend/apps/judge`

### Function 6: Campaign Admin CRUD
- **File:** `backend/apps/quests/views.py` (+ serializers.py, urls.py)
- **What:** DRF viewset for campaign management (admin only)
- **Time:** 2–3 hours
- **Tests needed:** Admin permission, filters, date validation
- **Verify:** `pytest backend/apps/quests`

**Merge Order for Round 1:** Function 6 → Function 5 → Functions 1 & 2

**Integration Gate:**
```bash
pnpm lint && pnpm build && pytest
```

---

## Round 2: May 12 (Admin Flow & Visibility)

**Implement Functions 4, 7, 8**

### Function 4: Campaign Rubric Form
- **File:** `frontend/src/components/CampaignRubricForm.tsx`
- **What:** React form for admins to configure campaign rubrics
- **Time:** 2–3 hours
- **Tests needed:** Form validation, weight sum warning, create/edit modes
- **Depends on:** Function 5 (rubric API must exist)
- **Verify:** `pnpm lint && pnpm build`

### Function 7: Admin Contributions List
- **File:** `backend/apps/contributions/views.py` (+ serializers.py, urls.py)
- **What:** DRF viewset to list/filter contributions (admin only, privacy-preserving)
- **Time:** 1–2 hours
- **Tests needed:** Admin permission, filters work, N+1 prevention
- **Verify:** `pytest backend/apps/contributions`

### Function 8: Admin Stats Endpoint
- **File:** `backend/apps/admin/views.py` (+ urls.py, cache setup)
- **What:** Aggregate statistics endpoint with 5-minute cache
- **Time:** 1–2 hours
- **Tests needed:** Empty DB case, aggregation correctness, cache behavior
- **Verify:** `pytest backend/apps/admin`

**Merge Order for Round 2:** Function 7 → Function 8 → Function 4

**Integration Gate:**
```bash
pnpm lint && pnpm build && pytest
```

---

## Round 3: May 13 (UX Polish & Performance)

**Implement Functions 3, 9 + Verification**

### Function 3: Enhanced AI Judge Hook
- **File:** `frontend/src/hooks/useAiJudge.ts`
- **What:** Progressive score updates with animations, error handling
- **Time:** 2–3 hours
- **Tests needed:** Streaming events, callbacks, error recovery
- **Depends on:** Backend scoring API (already exists)
- **Verify:** `pnpm lint && pnpm build`

### Function 9: Leaderboard Query Optimization
- **File:** `backend/apps/leaderboard/views.py` (+ serializers.py if needed)
- **What:** Eliminate N+1 queries using `select_related()` + annotations
- **Time:** 0.5–1 hour
- **Tests needed:** Query count regression, response shape unchanged
- **Verify:** `pytest backend/apps/leaderboard`

### Verification
- **File:** `docs/PHASE_1_VERIFICATION.md` (create verification checklist + endpoint tests)
- **What:** Document how to verify all Phase 1 work
- **Time:** 1–2 hours

**Merge Order for Round 3:** Function 9 → Function 3 → Verification docs

**Full Integration Gate:**
```bash
pnpm lint
pnpm build
pytest
docker compose up  # Smoke test
```

---

## Critical Global Rules

1. **Inspect existing code before editing** — Copy patterns from the repo, don't invent new ones
2. **Keep changes narrowly scoped** — Only touch assigned files + serializers/routes/tests
3. **No hardcoded secrets** — API keys, wallet IDs via environment variables only
4. **Preserve app behavior** — Don't break existing features unless spec explicitly requires it
5. **Follow repo patterns** — Match naming conventions, test structure, serializer style
6. **Add tests** — Following the repo's existing test patterns
7. **Document blockers** — If a model/serializer name differs, report the delta

---

## Standard Deliverable Format (Per Function or Round)

When you complete a function or round, report:

```
Files changed:
  - path/to/file1.tsx
  - path/to/file2.py

Functions implemented:
  - functionName1(params)
  - functionName2(params)

Commands run:
  pnpm lint
  [output]
  pnpm build
  [output]
  pytest backend/apps/judge
  [output]

Test results:
  [pass/fail count, coverage if applicable]

Known limitations:
  [blockers, deferred features, model name differences]

Required env vars or config:
  [list any env vars needed]

Manual integration/provider steps:
  [any setup still needed]
```

---

## Shared Type Contracts (All Teams Must Align)

**Rubric:**
```typescript
type RubricData = {
  id?: string | number
  campaign_id: string | number
  teaching_value_weight: number
  originality_weight: number
  community_impact_weight: number
  created_at?: string
  updated_at?: string
  warning?: string
}
```

**Campaign:**
```typescript
type CampaignData = {
  id: string | number
  title: string
  description?: string
  difficulty: 'D' | 'C' | 'B' | 'A' | 'S'
  reward_pool: string | number
  start_date: string
  end_date: string
  created_at?: string
  contributor_count?: number
  total_contributions?: number
  avg_score?: number
}
```

**Admin Stats:**
```typescript
type AdminStats = {
  total_campaigns: number
  active_campaigns: number
  total_contributions: number
  average_score: number
  total_xp_awarded: number
  unique_contributors: number
  farming_rate: number
  top_contributors: Array<{ wallet_address: string; total_xp: number; contributions_count: number }>
  score_distribution: Record<string, number>
  platform_breakdown: Record<string, number>
}
```

---

## Success Criteria: Phase 1 Done Definition

Phase 1 is complete when:

- ✅ Functions 1–9 all implemented or documented as blocked
- ✅ Wallet errors are user-friendly + retryable where appropriate
- ✅ Fallback wallet connectors available in specified order
- ✅ AI Judge hook supports streaming + animations + loading states
- ✅ Campaign rubric form fully functional (create/edit)
- ✅ Rubric API has correct validation + permissions (public GET, admin write)
- ✅ Campaign CRUD is admin-only with filters and sorting
- ✅ Contribution admin list is privacy-preserving (wallet address only)
- ✅ Admin stats endpoint returns aggregate payload without N+1 queries
- ✅ Leaderboard query is optimized (no linear query growth)
- ✅ `pnpm lint` passes
- ✅ `pnpm build` succeeds
- ✅ `pytest` passes (all tests)
- ✅ `docker compose up` smoke check succeeds
- ✅ No secrets or hardcoded credentials in code
- ✅ Existing app behavior preserved unless spec required change
- ✅ Final verification checklist completed and documented

---

## If You Get Stuck

**Report with:**
1. Exact error message
2. What you expected vs. what you found
3. Which function/round you're on
4. Whether this blocks other functions

**Example:**
> "Function 5, Round 1: ScoringRubric model doesn't have `teaching_value_weight` field. Found fields: `rubric_json` (dict). Blocker: Serializer expects individual weight fields but model stores JSON. Proposed fix: Add migration to split `rubric_json` into three columns OR adapt serializer to read/write from JSON."

---

## Timeline

- **May 11, 08:00 UTC** — Start Round 1
- **May 11, 16:00 UTC** — Round 1 complete, all merge gates passing
- **May 12, 08:00 UTC** — Start Round 2
- **May 12, 16:00 UTC** — Round 2 complete, all merge gates passing
- **May 13, 08:00 UTC** — Start Round 3
- **May 13, 23:59 UTC** — **SHIP DATE** — Phase 1 100% complete

---

## Before You Start

1. ✅ Read the 3 spec documents (20 min)
2. ✅ Verify environment locally (5 min)
3. ✅ Start Round 1, Function 6 first (Campaign CRUD foundation)
4. ✅ Report blockers immediately
5. ✅ Merge in specified sequence
6. ✅ Run integration gates between rounds
7. ✅ Ship May 13, 23:59 UTC

---

**You've got this. Let's build Phase 1! 🚀**

**Questions?** Check PHASE_1_PARALLEL_EXECUTION_PLAN.md for detailed team assignments, merge sequences, and exit criteria per round.
