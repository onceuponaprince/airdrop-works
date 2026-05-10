# Phase 1 Parallel Execution Plan: 3 Rounds, 9 Functions, 3 Teams

**Launch Window:** May 11–13, 2026  
**Target Completion:** May 13, 23:59 UTC  
**Verification Gate:** All functions pass `pnpm lint`, `pnpm build`, `pytest`, `docker compose up`

---

## Overview

This plan splits Phase 1 (9 functions) into three sequential rounds of parallel work. Each round has:
- **Team A, B, C** working independently on assigned functions
- **Clear dependencies** documented to prevent merge conflicts
- **Integration gates** between rounds with a defined merge sequence
- **Exit criteria** for each team and each round

**Key principle:** Teams work in parallel; rounds are sequential to respect dependencies.

---

## Global Rules (All Teams)

1. **Inspect before editing** — Review existing code patterns before adding new functions
2. **Keep changes narrowly scoped** — Only touch assigned files + adjacent serializers/routes/tests
3. **No secrets in code** — API keys, wallet IDs, admin credentials via env vars only
4. **Preserve app behavior** — Don't break existing features unless the spec explicitly requires it
5. **Follow repo patterns** — Adapt to existing naming, test structure, serializer style
6. **Test coverage** — Add/update tests matching the repo's existing test patterns
7. **Document blockers** — If a model, serializer, or dependency differs, report the delta

---

## Baseline Verification Checklist

All teams must pass before merge:

```bash
# Frontend
pnpm lint
pnpm build

# Backend
pytest
pytest --collect-only  # Verify tests can be discovered

# Full stack
docker compose up       # Smoke check all services
```

If your repo uses `npm`, `yarn`, or `python -m pytest` instead, use that command and document the substitution in your final report.

---

## Round 1: Critical Foundations (May 11)

**Goal:** Stabilize wallet UX, expose rubric API, add admin campaign CRUD surface.

**Duration:** 6–8 hours  
**Merge order:** Team C → Team B → Team A  
**Integration gate:** All teams pass verification before Round 2 starts

---

### Round 1, Team A: Wallet Error Handling & Fallback Connectors

**Owns:** Functions 1 + 2  
**Primary file:** `frontend/src/providers/ParticleWalletBridge.tsx`  
**Estimated time:** 2–3 hours

#### Function 1: handleWalletError

```typescript
function handleWalletError(
  error: unknown,
  retryCallback?: () => void
): { type: string; message: string; action?: string }
```

**Required mappings:**
- Network timeout → `"Network error. Please try again."`
- Signature rejected → `"Transaction cancelled by user."`
- User denied access → `"Please grant wallet permissions."`
- Generic error → `"Connection failed. Check your wallet."`

**Implementation hints:**
- Defensively normalize unknown errors
- Check `error.message`, `error.name`, `error.code`, `error.shortMessage`, `error.cause`
- Support wallet rejection code `4001` if applicable
- If `retryCallback` provided and error is retryable, return `action: "Retry"`
- **Do not invoke** `retryCallback` inside the handler — UI/toast layer triggers it
- Export the function for tests and downstream usage

**Helper shape suggestion:**

```typescript
type WalletNotification = {
  type: 'error' | 'warning' | 'info'
  message: string
  action?: string
}

function getErrorText(error: unknown): string {
  if (typeof error === 'string') return error
  if (error && typeof error === 'object') {
    const record = error as Record<string, unknown>
    return [
      record.shortMessage,
      record.message,
      record.name,
      typeof record.cause === 'object' && record.cause
        ? (record.cause as Record<string, unknown>).message
        : undefined,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
  }
  return ''
}
```

#### Function 2: getFallbackWalletConnectors

```typescript
function getFallbackWalletConnectors(): WalletConnector[]
```

**Fallback order:**
1. WalletConnect (universal bridge)
2. Coinbase Wallet (EVM-compatible)
3. MetaMask (direct injected provider)

**Requirements:**
- Each supports Avalanche + Base chains
- Use existing connector factories from repo (reuse Particle/wagmi abstractions)
- Do NOT add incompatible wallet frameworks
- Avoid duplicating connectors already in `evmWalletConnectors`
- Document any connector skipped due to missing dependency

#### Deliverables for Team A

- [ ] `handleWalletError()` implemented and exported
- [ ] `getFallbackWalletConnectors()` implemented and exported
- [ ] ParticleWalletBridge.tsx updated to use both functions
- [ ] Tests for error mapping (timeout, rejection, denied, generic)
- [ ] Tests for connector array order and chain support
- [ ] No secrets or provider credentials hardcoded
- [ ] `pnpm lint` passes
- [ ] `pnpm build` succeeds

#### Standard Final Response

```
Files changed:
  - frontend/src/providers/ParticleWalletBridge.tsx (added/updated)
  - frontend/src/hooks/useWalletError.ts (new, if extracted)
  - frontend/src/providers/WalletConnectors.ts (new, if extracted)

Functions implemented:
  - handleWalletError(error, retryCallback?)
  - getFallbackWalletConnectors()

Commands run:
  pnpm lint
  pnpm build

Test results:
  [Include test output]

Known limitations:
  [Document any blockers or deferred features]

Required env vars or config:
  [List any additional setup needed]

Manual integration/provider steps:
  [Document any provider setup still needed]
```

---

### Round 1, Team B: Campaign Rubric API Endpoints

**Owns:** Function 5  
**Primary file:** `backend/apps/judge/views.py`  
**Adjacent files:** `judge/serializers.py`, `judge/urls.py`, `judge/tests/`  
**Estimated time:** 2–3 hours

#### Function 5: RubricViewSet

Endpoints:
- `GET /api/v1/judge/rubric/` — List all rubrics
- `POST /api/v1/judge/rubric/` — Create new rubric
- `GET /api/v1/judge/rubric/{id}/` — Retrieve by ID
- `PUT /api/v1/judge/rubric/{id}/` — Update
- `DELETE /api/v1/judge/rubric/{id}/` — Delete

**Serialization:**

Input fields:
- `campaign_id`
- `teaching_value_weight`
- `originality_weight`
- `community_impact_weight`

Output fields:
- Input fields + `created_at`, `updated_at`, `id`

**Validation:**
- Weights: integers 0–100
- Sum weights: should equal 100 (warn, don't error per spec)
- `campaign_id`: must exist in quests table
- If weight sum ≠ 100, add response warning if serializer pattern supports it; otherwise document limitation

**Permissions:**
- GET: public read-only (demo)
- POST/PUT/DELETE: `IsAuthenticated` + `IsAdminOrReadOnly` (or repo equivalent)

**Suggested warning pattern:**

```python
def validate(self, attrs):
    total = (
        attrs.get("teaching_value_weight", 0)
        + attrs.get("originality_weight", 0)
        + attrs.get("community_impact_weight", 0)
    )
    attrs["_weight_sum_warning"] = total != 100
    return attrs
```

Use private attrs only if serializer/view pattern can safely remove before save.

#### Deliverables for Team B

- [ ] `ScoringRubricSerializer` implemented
- [ ] `RubricViewSet` with all 5 endpoints
- [ ] Route registered at `/api/v1/judge/rubric/`
- [ ] Validation: weights 0–100, campaign_id exists
- [ ] Weight-sum warning implemented (warn, don't block)
- [ ] Permission: public GET, admin POST/PUT/DELETE
- [ ] Tests: GET list public, GET detail public, POST/PUT/DELETE need auth + admin
- [ ] Tests: invalid campaign ID → 400, negative weight → 400
- [ ] Tests: weight sum ≠ 100 does not block creation
- [ ] `pytest backend/apps/judge` passes

#### Standard Final Response

```
Files changed:
  - backend/apps/judge/views.py (RubricViewSet added/updated)
  - backend/apps/judge/serializers.py (ScoringRubricSerializer added)
  - backend/apps/judge/urls.py (route registration)
  - backend/apps/judge/tests/test_rubric.py (new or updated)

Functions implemented:
  - RubricViewSet (list, create, retrieve, update, destroy)

Commands run:
  pytest backend/apps/judge
  pytest backend/apps/judge -v

Test results:
  [Include test output]

Known limitations:
  [Document any model name or field differences]

Required env vars or config:
  [List any additional setup needed]

Manual integration/provider steps:
  [None expected for backend]
```

---

### Round 1, Team C: Admin Campaign CRUD Endpoints

**Owns:** Function 6  
**Primary file:** `backend/apps/quests/views.py`  
**Adjacent files:** `quests/serializers.py`, `quests/urls.py`, `quests/tests/`  
**Estimated time:** 2–3 hours

#### Function 6: CampaignViewSet

Endpoints:
- `GET /api/v1/admin/campaigns/` — List campaigns (filtered, sorted)
- `POST /api/v1/admin/campaigns/` — Create campaign
- `GET /api/v1/admin/campaigns/{id}/` — Retrieve by ID
- `PUT /api/v1/admin/campaigns/{id}/` — Update
- `DELETE /api/v1/admin/campaigns/{id}/` — Delete

**Query parameters:**
- `?status=active|ended|upcoming` — Filter by status
- `?sort_by=created_at|start_date|contributor_count` — Sort (allowlisted)

**Serialization:**

Input fields:
- `title`
- `description`
- `difficulty`
- `reward_pool`
- `start_date`
- `end_date`

Output fields:
- Input fields + `id`, `created_at`, `contributor_count`, `total_contributions`, `avg_score`

**Validation:**
- `end_date` must be after `start_date`
- `difficulty` one of `D`, `C`, `B`, `A`, `S`
- `reward_pool >= 0`
- `title` unique

**Permissions:**
- All endpoints: `IsAuthenticated` + `IsAdminUser`

**Implementation hints:**
- Use annotations for contributor and contribution stats (ORM aggregation, not Python loop)
- Keep filtering logic in `get_queryset()`
- Validate `sort_by` against allowlist; fallback or error if unknown
- Status filter: use `start_date`, `end_date` to determine active/ended/upcoming

#### Deliverables for Team C

- [ ] `CampaignSerializer` implemented
- [ ] `CampaignViewSet` with all 5 endpoints
- [ ] Route registered at `/api/v1/admin/campaigns/`
- [ ] Filtering: status, sort_by (allowlisted)
- [ ] Validation: end_date after start_date, difficulty in {D,C,B,A,S}, reward_pool >= 0, title unique
- [ ] Annotations for contributor_count, total_contributions, avg_score
- [ ] Permission: admin only (all endpoints)
- [ ] Tests: anonymous denied, non-admin denied, admin list/create/update/delete succeeds
- [ ] Tests: duplicate title fails, invalid difficulty fails, date validation fails, status filters work, sort allowlist works
- [ ] `pytest backend/apps/quests` passes

#### Standard Final Response

```
Files changed:
  - backend/apps/quests/views.py (CampaignViewSet added/updated)
  - backend/apps/quests/serializers.py (CampaignSerializer added)
  - backend/apps/quests/urls.py (route registration)
  - backend/apps/quests/tests/test_campaigns.py (new or updated)

Functions implemented:
  - CampaignViewSet (list, create, retrieve, update, destroy)

Commands run:
  pytest backend/apps/quests
  pytest backend/apps/quests -v

Test results:
  [Include test output]

Known limitations:
  [Document any model name or field differences]

Required env vars or config:
  [List any additional setup needed]

Manual integration/provider steps:
  [None expected for backend]
```

---

### Round 1 Integration Gate

**Merge sequence:**
1. **Team C** campaign CRUD (foundation for other endpoints)
2. **Team B** rubric API (depends on campaign model)
3. **Team A** wallet functions (independent)

**After all merges, run:**

```bash
pnpm lint
pnpm build
pytest
```

**If any test fails:**
- Report exact command
- First meaningful error block
- Failure type (frontend/backend/db/auth/provider)
- Suggested fix owner

**Gate requirement:** All three teams must pass verification before Round 2 starts.

---

## Round 2: Frontend Admin Flow & Backend Admin Visibility (May 12)

**Goal:** Connect rubric form to backend API, expose contribution review tools, add dashboard stats.

**Duration:** 6–8 hours  
**Depends on:** Round 1 merge complete  
**Merge order:** Team B → Team C → Team A  
**Integration gate:** All teams pass verification before Round 3 starts

---

### Round 2, Team A: Campaign Rubric Form Component

**Owns:** Function 4  
**Primary file:** `frontend/src/components/CampaignRubricForm.tsx`  
**Adjacent files:** `api/`, `types/`, related components  
**Estimated time:** 2–3 hours

#### Function 4: CampaignRubricForm

```typescript
function CampaignRubricForm({
  campaignId,
  onSuccess,
  onCancel,
}: {
  campaignId?: string | null
  onSuccess: (rubric: RubricData) => void
  onCancel: () => void
}): JSX.Element
```

**Form fields:**
- Campaign name (string, required, 3–100 chars)
- Description (text area, optional)
- Teaching value weight (number, 0–100, required)
- Originality weight (number, 0–100, required)
- Community impact weight (number, 0–100, required)

**Validation:**
- Campaign name min 3, max 100 characters
- Campaign name unique (check via API)
- Weights should sum to 100; warn if not (non-blocking)

**Submission:**
- Create mode: `POST /api/v1/judge/rubric/`
- Edit mode: `PUT /api/v1/judge/rubric/{campaignId}/`

**Integration note (CRITICAL):**

The spec includes `campaign name` + `description` in the form, but the rubric API only accepts `campaign_id` + weights. **Before implementing, determine:**
- Are campaigns created separately via `/api/v1/admin/campaigns/`?
- Should this form create a campaign first, then a rubric?
- Or select an existing campaign from a dropdown?

**If you find a gap:**
- Document it clearly
- Either add a campaign picker component or create/update campaign first
- Report any blocked integration

**Types:**

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

#### Deliverables for Team A

- [ ] `CampaignRubricForm` component implemented
- [ ] Form fields: name, description, three weights
- [ ] Validation: name length 3–100, unique check via API
- [ ] Weight sum validation: warn if ≠ 100 (non-blocking)
- [ ] Create mode: POST to `/api/v1/judge/rubric/`
- [ ] Edit mode: PUT to `/api/v1/judge/rubric/{campaignId}/`
- [ ] Calls `onSuccess(rubric)` on submit success
- [ ] Calls `onCancel()` on cancel
- [ ] Error handling: display error message, allow retry
- [ ] Tests: renders, validates name, validates weights, submits create/edit, success/cancel callbacks
- [ ] `pnpm lint` passes
- [ ] `pnpm build` succeeds
- [ ] **Integration gap report** if campaign API contract differs from expected

#### Standard Final Response

```
Files changed:
  - frontend/src/components/CampaignRubricForm.tsx (new)
  - frontend/src/types/rubric.ts (new or updated)
  - frontend/src/api/rubric.ts (helpers added if needed)

Functions implemented:
  - CampaignRubricForm(campaignId, onSuccess, onCancel)

Commands run:
  pnpm lint
  pnpm build

Test results:
  [Include test output]

Known limitations:
  [Campaign API integration: document how campaign_id is provided or determined]

Required env vars or config:
  [None expected]

Manual integration/provider steps:
  [Document how form is wired to admin page or campaign dashboard]
```

---

### Round 2, Team B: Contributions Admin List & Filter

**Owns:** Function 7  
**Primary file:** `backend/apps/contributions/views.py`  
**Adjacent files:** `contributions/serializers.py`, `contributions/urls.py`, `contributions/tests/`  
**Estimated time:** 2–3 hours

#### Function 7: ContributionAdminViewSet

Endpoints:
- `GET /api/v1/admin/contributions/` — List with filters
- `GET /api/v1/admin/contributions/{id}/` — Retrieve by ID

**Query parameters (all optional):**
- `?campaign_id={id}` — Filter by campaign
- `?min_score={number}` — Filter by minimum score
- `?max_score={number}` — Filter by maximum score
- `?is_farming={true|false}` — Filter by farming flag
- `?sort_by=score|created_at|user__wallet_address` — Sort (allowlisted)

**Serialization output:**
- `id`
- `campaign_id`
- `wallet_address` (from user, not full user object — privacy)
- `platform`
- `content_text`
- `content_url`
- `scores` (JSON/dict)
- `total_score`
- `farming_flag`
- `xp_awarded`
- `created_at`
- `scoring_metadata` (JSON/dict)

**Permissions:**
- `IsAuthenticated` + `IsAdminUser` for both endpoints

**Validation:**
- `min_score`, `max_score`: integers 0–100
- `min_score <= max_score` if both provided
- `sort_by`: allowlisted only (score, created_at, user__wallet_address)
- `is_farming`: safe boolean values

**Implementation hints:**
- Use `select_related("user", "campaign")` to avoid N+1
- Return wallet address only, not full user profile (privacy)
- Use pagination if DRF default pagination exists
- Validate sort allowlist; fallback or error on unknown field

#### Deliverables for Team B

- [ ] `ContributionAdminSerializer` implemented (wallet address only, not full user)
- [ ] `ContributionAdminViewSet` with list + retrieve
- [ ] Route registered at `/api/v1/admin/contributions/`
- [ ] Filters: campaign_id, min_score, max_score, is_farming, sort_by (allowlisted)
- [ ] Validation: min_score, max_score integers 0–100, min ≤ max
- [ ] Permission: admin only
- [ ] Query optimization: `select_related()` to prevent N+1
- [ ] Tests: anonymous denied, non-admin denied, admin list succeeds
- [ ] Tests: campaign filter, score range filters, farming filter, sort allowlist all work
- [ ] Tests: serializer exposes wallet address, hides user profile
- [ ] `pytest backend/apps/contributions` passes

#### Standard Final Response

```
Files changed:
  - backend/apps/contributions/views.py (ContributionAdminViewSet added)
  - backend/apps/contributions/serializers.py (ContributionAdminSerializer added)
  - backend/apps/contributions/urls.py (route registration)
  - backend/apps/contributions/tests/test_admin.py (new or updated)

Functions implemented:
  - ContributionAdminViewSet (list, retrieve)

Commands run:
  pytest backend/apps/contributions
  pytest backend/apps/contributions -v

Test results:
  [Include test output]

Known limitations:
  [Document any serializer field name differences]

Required env vars or config:
  [None expected]

Manual integration/provider steps:
  [None expected]
```

---

### Round 2, Team C: Admin Statistics Endpoint

**Owns:** Function 8  
**Primary file:** `backend/apps/admin/views.py` (or `admin/stats.py`)  
**Adjacent files:** `admin/urls.py`, `admin/tests/`  
**Estimated time:** 2–3 hours

#### Function 8: admin_stats

Endpoint: `GET /api/v1/admin/stats/`

**Response structure:**

```json
{
  "total_campaigns": 0,
  "active_campaigns": 0,
  "total_contributions": 0,
  "average_score": 0.0,
  "total_xp_awarded": 0,
  "unique_contributors": 0,
  "farming_rate": 0.0,
  "top_contributors": [
    {
      "wallet_address": "0x...",
      "total_xp": 0,
      "contributions_count": 0
    }
  ],
  "score_distribution": {
    "0_20": 0,
    "21_40": 0,
    "41_60": 0,
    "61_80": 0,
    "81_100": 0
  },
  "platform_breakdown": {
    "twitter": 0,
    "discord": 0,
    "github": 0
  }
}
```

**Permissions:**
- `IsAuthenticated` + `IsAdminUser`

**Performance:**
- Use Django ORM `Count`, `Avg`, `Sum` (not Python loops)
- Cache for 5 minutes using `cache.set("admin_stats:v1", ..., 300)`
- Do not add hard Redis dependency if repo has fallback local-memory cache for dev
- Avoid N+1 queries

**Implementation hints:**
- Empty database should return zeroed values, not nulls
- Top contributors: include wallet address, total XP, contribution count only
- Active campaigns: use `start_date <= today <= end_date` logic
- Farming rate: `count(farming_flagged) / total_contributions` (handle division by zero)
- Score distribution: annotate with conditional `Count` per bucket
- Platform breakdown: use `values("platform").annotate(Count("id"))`

**Suggested cache pattern:**

```python
from django.core.cache import cache

def get_admin_stats():
    cached = cache.get("admin_stats:v1")
    if cached:
        return cached
    
    # Compute stats using ORM aggregation
    stats = {...}
    
    cache.set("admin_stats:v1", stats, 300)  # 5 min
    return stats
```

#### Deliverables for Team C

- [ ] `admin_stats()` function or API view implemented
- [ ] Route registered at `/api/v1/admin/stats/`
- [ ] Response shape matches spec exactly
- [ ] Aggregation: use ORM Count/Avg/Sum, not Python loops
- [ ] Cache: 5-minute TTL with fallback for dev (no hard Redis dependency)
- [ ] Empty database: returns zeroed values, not nulls
- [ ] Farming rate: correct calculation, handles zero division
- [ ] Top contributors: 5–10 results, sorted by total_xp desc
- [ ] Score distribution: correct bucket boundaries
- [ ] Platform breakdown: all platforms present (even if count 0)
- [ ] Permission: admin only
- [ ] Tests: anonymous denied, non-admin denied, admin receives expected shape
- [ ] Tests: empty DB returns zeroed values, populated DB returns correct aggregates
- [ ] Tests: farming rate calculation verified, score distribution buckets verified
- [ ] Tests: cache path does not break fresh calculations
- [ ] `pytest backend/apps/admin` passes

#### Standard Final Response

```
Files changed:
  - backend/apps/admin/views.py (admin_stats added)
  - backend/apps/admin/urls.py (route registration)
  - backend/apps/admin/tests/test_stats.py (new or updated)

Functions implemented:
  - admin_stats() — GET /api/v1/admin/stats/

Commands run:
  pytest backend/apps/admin
  pytest backend/apps/admin -v

Test results:
  [Include test output]

Known limitations:
  [Document any cache backend or ORM limitation]

Required env vars or config:
  [Cache backend if applicable]

Manual integration/provider steps:
  [None expected]
```

---

### Round 2 Integration Gate

**Merge sequence:**
1. **Team B** contribution admin list (foundation)
2. **Team C** admin stats (independent)
3. **Team A** rubric form (frontend, depends on backend routes stable)

**After all merges, run:**

```bash
pnpm lint
pnpm build
pytest
```

**Gate requirement:** All teams pass before Round 3 starts.

---

## Round 3: Scoring UX, Performance, Final Integration (May 13)

**Goal:** Real-time AI Judge scoring experience, fix leaderboard performance, final smoke checks.

**Duration:** 6–8 hours  
**Depends on:** Round 2 merge complete  
**Merge order:** Team B → Team A → Team C  
**Integration gate:** Full Phase 1 done definition met

---

### Round 3, Team A: Streaming Score Animation Hook

**Owns:** Function 3  
**Primary file:** `frontend/src/hooks/useAiJudge.ts`  
**Estimated time:** 2–3 hours

#### Function 3: Enhanced useAiJudge

```typescript
function useAiJudge(
  onScoreUpdate?: (scoreType: string, value: number) => void
): {
  isLoading: boolean
  scores: Record<string, number>
  totalScore: number
  isFarming: boolean
  error: string | null
  score: (text: string) => Promise<void>
}
```

**Behavior:**
- Initial call: `isLoading=true`, show skeleton loader
- Each SSE event: update one score, call `onScoreUpdate(scoreType, value)` so UI can animate
- Stream complete: `isLoading=false`, compute `totalScore`, set `isFarming`
- Error: `error` is set, show retry button
- Cleanup: abort in-flight request on component unmount

**Score keys (canonical):**
- `teaching_value`
- `originality`
- `community_impact`

**Implementation hints:**
- Preserve existing API endpoint contract if any
- If backend does not stream SSE yet, adapt around existing response and document limitation
- Abort previous request if new one starts: use `AbortController`
- Clamp score values to safe numeric range (0–100)
- Handle malformed SSE events gracefully (warn, skip)

**Suggested hook shape:**

```typescript
const [isLoading, setIsLoading] = useState(false)
const [scores, setScores] = useState({})
const [totalScore, setTotalScore] = useState(0)
const [isFarming, setIsFarming] = useState(false)
const [error, setError] = useState<string | null>(null)

const score = async (text: string) => {
  setIsLoading(true)
  setError(null)
  const controller = new AbortController()

  try {
    // Fetch from /api/judge/score with signal: controller.signal
    // Handle SSE events, call onScoreUpdate for each
    // On complete, compute total and set isFarming
  } catch (err) {
    setError(err.message)
  } finally {
    setIsLoading(false)
  }
}

return { isLoading, scores, totalScore, isFarming, error, score }
```

#### Deliverables for Team A

- [ ] Enhanced `useAiJudge()` hook implemented
- [ ] Returns correct shape: isLoading, scores, totalScore, isFarming, error, score()
- [ ] Initial state: isLoading=true on score() call
- [ ] Progressive updates: onScoreUpdate() called per score event
- [ ] Completion: totalScore computed, isFarming set
- [ ] Error handling: error state set, allows retry
- [ ] Score keys canonical: teaching_value, originality, community_impact
- [ ] Request abort: cleanup on unmount or new request
- [ ] Score clamping: values safe (0–100)
- [ ] Tests: initial state, loading on score, update callbacks, completion, error, cleanup
- [ ] Existing judge scoring UI consumes hook without breaking
- [ ] `pnpm lint` passes
- [ ] `pnpm build` succeeds
- [ ] **Note:** If backend does not stream SSE, document the adapter limitation

#### Standard Final Response

```
Files changed:
  - frontend/src/hooks/useAiJudge.ts (enhanced)

Functions implemented:
  - useAiJudge(onScoreUpdate?)

Commands run:
  pnpm lint
  pnpm build

Test results:
  [Include test output]

Known limitations:
  [If no backend SSE support, document adapter pattern]

Required env vars or config:
  [None expected]

Manual integration/provider steps:
  [None expected if backend scoring already works]
```

---

### Round 3, Team B: Leaderboard Query Optimization

**Owns:** Function 9  
**Primary file:** `backend/apps/leaderboard/views.py`  
**Estimated time:** 1–2 hours

#### Function 9: Leaderboard get_queryset Optimization

Optimize `LeaderboardViewSet.get_queryset()`:

```python
def get_queryset(self):
    return (
        User.objects
        .select_related('profile')  # Avoid N+1 for profile
        .prefetch_related('contributions')  # Only if needed for aggregation
        .annotate(
            contribution_count=Count('contributions'),
            total_score=Sum('contributions__total_score'),
        )
        .order_by('-total_score')  # Use annotated field
    )
```

**Expected outcome:**
- One queryset for users with aggregated stats
- Serializer reads annotated fields (no N+1 from SerializerMethodField)
- Response shape unchanged

**Implementation hints:**
- Inspect serializer for `SerializerMethodField` that queries relationships
- Replace method fields with annotated values or prefetched data
- Do not use `prefetch_related` for aggregation; use `Count`/`Sum` instead
- Verify sorting uses annotated fields
- Add query-count regression test if framework supports `assertNumQueries`

#### Deliverables for Team B

- [ ] `get_queryset()` optimized with `select_related()` + annotations
- [ ] No N+1 queries for users with profiles/contributions
- [ ] Serializer updated to use annotated fields, not method fields
- [ ] Sorting uses annotated field (not database query)
- [ ] Response shape unchanged from original
- [ ] Tests: leaderboard returns users sorted by score
- [ ] Tests: query count does not grow linearly with users (regression test)
- [ ] Tests: users without profile/contributions don't break response
- [ ] `pytest backend/apps/leaderboard` passes

#### Standard Final Response

```
Files changed:
  - backend/apps/leaderboard/views.py (get_queryset optimized)
  - backend/apps/leaderboard/serializers.py (SerializerMethodField replaced if needed)
  - backend/apps/leaderboard/tests/test_leaderboard.py (regression test added)

Functions implemented:
  - LeaderboardViewSet.get_queryset() — optimized

Commands run:
  pytest backend/apps/leaderboard
  pytest backend/apps/leaderboard -v

Test results:
  [Include test output including query count check]

Known limitations:
  [Document any relationship names that differ]

Required env vars or config:
  [None expected]

Manual integration/provider steps:
  [None expected]
```

---

### Round 3, Team C: Phase 1 Integration & Endpoint Verification

**Owns:** Cross-functional hardening after Teams A/B complete

Prepare (can start now in parallel):

1. **Endpoint verification script** or Postman/curl collection for:
   - `GET /api/v1/judge/rubric/`
   - `POST /api/v1/judge/rubric/` (admin)
   - `GET /api/v1/admin/campaigns/`
   - `POST /api/v1/admin/campaigns/` (admin)
   - `GET /api/v1/admin/contributions/` (admin)
   - `GET /api/v1/admin/stats/` (admin)

2. **Frontend smoke checklist:**
   - Wallet error handling displays user-friendly messages
   - Fallback wallet connectors appear/configure
   - Campaign rubric form creates/edits successfully
   - AI Judge score streaming/loading/error states work

3. **Integration verification document:**

**File:** `docs/PHASE_1_VERIFICATION.md`

**Content:**

```markdown
# Phase 1 Verification Checklist

## Required Test Users

- [ ] Anonymous user
- [ ] Authenticated non-admin user
- [ ] Authenticated admin user (can create campaigns/rubrics)

## Required Sample Data

- [ ] At least 2 campaigns (one active, one upcoming)
- [ ] At least 3 contributions (mixed scores)
- [ ] At least 1 contribution flagged as farming
- [ ] At least 1 scoring rubric

## Permission Tests

- [ ] Anonymous cannot POST/PUT/DELETE rubric
- [ ] Non-admin cannot POST/PUT/DELETE rubric
- [ ] Admin can POST/PUT/DELETE rubric
- [ ] Anonymous cannot access admin endpoints
- [ ] Non-admin cannot access admin endpoints
- [ ] Admin can access all admin endpoints

## Endpoint Smoke Tests

### Rubric API

```bash
curl -X GET http://localhost:8000/api/v1/judge/rubric/
curl -X POST http://localhost:8000/api/v1/judge/rubric/ \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d {...}
```

### Admin Campaigns

```bash
curl -X GET http://localhost:8000/api/v1/admin/campaigns/ \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### Admin Contributions

```bash
curl -X GET http://localhost:8000/api/v1/admin/contributions/ \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### Admin Stats

```bash
curl -X GET http://localhost:8000/api/v1/admin/stats/ \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

## Frontend Smoke Tests

- [ ] Wallet connects without error messages
- [ ] Wallet error displays friendly message + retry
- [ ] Fallback wallets appear in list
- [ ] Campaign rubric form displays + validates
- [ ] AI Judge scoring initiates + streams + completes
- [ ] AI Judge error state shows + allows retry

## Full Stack Test

```bash
pnpm lint
pnpm build
pytest
docker compose up
```

If any failures occur:
- Report exact command
- First error block
- Failure category (frontend/backend/db/auth/provider)
- Suggested fix owner
```

#### Deliverables for Team C

- [ ] Endpoint verification script or Postman collection created
- [ ] Frontend smoke test checklist documented
- [ ] Integration verification document created at `docs/PHASE_1_VERIFICATION.md`
- [ ] All required test users and sample data documented
- [ ] All permission tests documented
- [ ] All endpoint smoke test commands documented
- [ ] Full stack verification command documented

#### Standard Final Response

```
Files created/changed:
  - docs/PHASE_1_VERIFICATION.md (new)
  - postman/Phase1_Integration_Tests.json (new, if applicable)
  - scripts/verify_phase1_endpoints.sh (new, if applicable)

Functions implemented:
  - None (verification infrastructure only)

Commands run:
  [Document any prep/setup commands]

Test results:
  [Pending Teams A/B merge before running full verification]

Known limitations:
  [None expected]

Required env vars or config:
  [Document test user credentials, admin token, etc.]

Manual integration/provider steps:
  [Create test users, sample data, as needed]
```

---

### Round 3 Final Integration Gate

**Merge sequence:**
1. **Team B** leaderboard optimization
2. **Team A** streaming AI Judge hook
3. **Team C** verification docs

**After all merges, run FULL VERIFICATION:**

```bash
# Format check
pnpm lint
pnpm build

# Backend tests
pytest

# Docker stack smoke check
docker compose up -d
sleep 10
curl http://localhost:8000/api/v1/health/  # If health endpoint exists
docker compose down

# If any failure:
# - Run first failing test in isolation
# - Capture full error output
# - Report to team for fix
```

**Gate requirement:** All Phase 1 done criteria met (see below).

---

## Phase 1 Done Definition

**Phase 1 is complete when:**

- [x] Function 1: `handleWalletError()` implemented, exported, tested
- [x] Function 2: `getFallbackWalletConnectors()` implemented, exported, tested
- [x] Function 3: `useAiJudge()` enhanced for streaming + animations
- [x] Function 4: `CampaignRubricForm` component fully functional
- [x] Function 5: `RubricViewSet` CRUD complete with validation + permissions
- [x] Function 6: `CampaignViewSet` admin CRUD complete with filters
- [x] Function 7: `ContributionAdminViewSet` list + filters, privacy-preserving
- [x] Function 8: `admin_stats()` endpoint complete with aggregations + cache
- [x] Function 9: Leaderboard query optimized, no N+1 behavior
- [x] All team deliverables completed per round exit criteria
- [x] `pnpm lint` passes
- [x] `pnpm build` succeeds
- [x] `pytest` passes (all backend tests)
- [x] `docker compose up` smoke check succeeds
- [x] Verification checklist completed
- [x] No secrets or hardcoded credentials in code
- [x] Existing app behavior preserved unless spec required change

**Blocked function criteria:**
- If a function cannot be implemented due to missing repo dependencies (model, serializer, etc.), document the exact blocker and escalate to project lead
- Workaround: implement mock/stub version that demonstrates intent, document limitation

---

## Reference: Shared API Contracts

All teams must align on these types.

### RubricData

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

### CampaignData

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

### ContributionAdminRow

```typescript
type ContributionAdminRow = {
  id: string | number
  campaign_id: string | number
  wallet_address: string
  platform: string
  content_text?: string
  content_url?: string
  scores: Record<string, number>
  total_score: number
  farming_flag: boolean
  xp_awarded: number
  created_at: string
  scoring_metadata?: Record<string, unknown>
}
```

### AdminStats

```typescript
type AdminStats = {
  total_campaigns: number
  active_campaigns: number
  total_contributions: number
  average_score: number
  total_xp_awarded: number
  unique_contributors: number
  farming_rate: number
  top_contributors: Array<{
    wallet_address: string
    total_xp: number
    contributions_count: number
  }>
  score_distribution: {
    '0_20': number
    '21_40': number
    '41_60': number
    '61_80': number
    '81_100': number
  }
  platform_breakdown: Record<string, number>
}
```

---

## Recommended Git Branch Names

```
feature/r1-wallet-errors-fallbacks
feature/r1-rubric-api
feature/r1-admin-campaign-crud
feature/r2-campaign-rubric-form
feature/r2-admin-contributions
feature/r2-admin-stats
feature/r3-ai-judge-streaming-hook
feature/r3-leaderboard-optimization
feature/r3-phase1-verification
```

---

## Escalation Path

If a team encounters a blocker:

1. **Document exactly:** What did you expect? What did you find?
2. **Check adjacent code:** Does a related model/serializer exist with a different name?
3. **Report to team:** Slack/GitHub comment with blocker title + mitigation plan
4. **Do not wait.** If blocked, start a workaround/mock version and flag it

**Escalation owner:** Project lead (me)

---

## Timeline Summary

| Round | Duration | Teams | Gate Criteria | Merge Sequence |
|-------|----------|-------|---------------|----------------|
| **R1** | May 11, 6–8h | A, B, C | Lint + Build + Pytest | C → B → A |
| **R2** | May 12, 6–8h | A, B, C | Lint + Build + Pytest | B → C → A |
| **R3** | May 13, 6–8h | A, B, C | Full Phase 1 Done Def | B → A → C |

**May 13, 23:59 UTC:** Phase 1 complete, ready for Phase 2 (May 14–24).

---

## Questions or Blockers?

- **Team A (Wallet/Hooks):** Slack #frontend-dev
- **Team B (Backend APIs/Views):** Slack #backend-dev
- **Team C (Cross-functional/Verification):** Slack #phase1-coordination

**Final report template:** Copy the "Standard Final Response" section for your team's round and fill in all fields.

---

**Good luck! Ship fast, communicate early, ask for help before you're stuck. Phase 1 shipping May 13. 🚀**
