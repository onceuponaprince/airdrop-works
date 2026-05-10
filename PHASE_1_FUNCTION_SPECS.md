# Phase 1 Function Specifications

## Overview
These are the exact functions to be built for Phase 1 (May 11–13). Pass this document to another AI for implementation, then provide the completed code back for integration.

---

## Frontend Functions

### 1. Enhanced Wallet Error Handler
**File:** `frontend/src/providers/ParticleWalletBridge.tsx`

**Function Signature:**
```typescript
/**
 * Handle wallet connection errors and display user-friendly messages
 * 
 * @param error - Error object from Particle ConnectKit or wagmi
 * @param retryCallback - Optional function to retry the failed operation
 * @returns Toast notification dispatch object
 * 
 * Expected behavior:
 * - Network timeout → "Network error. Please try again."
 * - Signature rejected → "Transaction cancelled by user."
 * - User denied access → "Please grant wallet permissions."
 * - Generic error → "Connection failed. Check your wallet."
 */
function handleWalletError(
  error: unknown,
  retryCallback?: () => void
): { type: string; message: string; action?: string }
```

**Usage:**
```typescript
try {
  // ... wallet connection code
} catch (error) {
  const notification = handleWalletError(error, () => openConnectModal())
  showToast(notification)
}
```

---

### 2. Wallet Network Fallback Manager
**File:** `frontend/src/providers/ParticleWalletBridge.tsx`

**Function Signature:**
```typescript
/**
 * Configure fallback wallet providers if Particle Network is unavailable
 * 
 * @returns Array of configured fallback wallet connectors
 * 
 * Fallback order:
 * 1. WalletConnect (universal bridge)
 * 2. Coinbase Wallet (EVM-compatible)
 * 3. MetaMask (direct injected provider)
 * 
 * Each fallback should support Avalanche + Base chains
 */
function getFallbackWalletConnectors(): WalletConnector[]
```

**Usage:**
```typescript
const particleConfig = createConfig({
  // ... existing Particle config
  walletConnectors: [
    ...evmWalletConnectors({}),
    ...getFallbackWalletConnectors(),
  ],
})
```

---

### 3. Streaming Score Animation Hook
**File:** `frontend/src/hooks/useAiJudge.ts`

**Function Signature:**
```typescript
/**
 * Enhanced hook for streaming AI Judge scores with real-time animation
 * 
 * @param onScoreUpdate - Callback when individual scores arrive (teaching_value, originality, community_impact)
 * @returns {
 *   isLoading: boolean - True while streaming
 *   scores: { teaching_value: number; originality: number; community_impact: number }
 *   totalScore: number - Weighted sum of scores
 *   isFarming: boolean - Suspected farming activity
 *   error: string | null
 *   score: (text: string) => Promise<void> - Initiate scoring request
 * }
 * 
 * Behavior:
 * - Initial call: Set isLoading=true, show skeleton
 * - Each SSE event: Call onScoreUpdate(score), animate bar to new value
 * - Stream complete: Set isLoading=false, show total + farming badge
 * - Error: Show retry button
 */
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

**Usage:**
```typescript
const { scores, totalScore, isFarming, isLoading, error, score } = useAiJudge(
  (type, value) => {
    // Animate score bar for `type` to `value`
    animateScoreBar(type, value)
  }
)
```

---

### 4. Campaign Rubric Form Component
**File:** `frontend/src/components/CampaignRubricForm.tsx`

**Function Signature:**
```typescript
/**
 * React form component for creating/editing campaign-specific scoring rubric
 * 
 * @param campaignId - Existing campaign ID (edit mode) or null (create mode)
 * @param onSuccess - Callback after form submission succeeds
 * @param onCancel - Callback if user cancels form
 * 
 * Form fields:
 * - Campaign name (string, required)
 * - Description (text area, optional)
 * - Teaching value weight (0-100, required)
 * - Originality weight (0-100, required)
 * - Community impact weight (0-100, required)
 * 
 * Validation:
 * - All weights must sum to 100 (or warn user)
 * - Campaign name must be unique (check via API)
 * - Min 3 characters, max 100 characters
 * 
 * Submission:
 * - POST /api/v1/judge/rubric/ (create mode)
 * - PUT /api/v1/judge/rubric/{campaignId}/ (edit mode)
 * 
 * @returns React component
 */
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

**Usage:**
```typescript
<CampaignRubricForm
  campaignId={null}
  onSuccess={(rubric) => {
    console.log("Rubric created:", rubric)
    navigateTo("/admin/campaigns")
  }}
  onCancel={() => navigateTo("/admin")}
/>
```

---

## Backend Functions

### 5. Campaign Rubric API Endpoints
**File:** `backend/apps/judge/views.py`

**Function Signatures:**
```python
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

"""
Implement a DRF viewset for ScoringRubric model

Endpoints needed:
- GET /api/v1/judge/rubric/ - List all rubrics
- POST /api/v1/judge/rubric/ - Create new rubric
- GET /api/v1/judge/rubric/{id}/ - Retrieve rubric by ID
- PUT /api/v1/judge/rubric/{id}/ - Update rubric
- DELETE /api/v1/judge/rubric/{id}/ - Delete rubric

Serialization:
- Input: { campaign_id, teaching_value_weight, originality_weight, community_impact_weight }
- Output: Same + { created_at, updated_at }

Validation:
- Weights must be positive integers (>= 0)
- Sum of weights should equal 100 (warn if not, don't error)
- campaign_id must exist in campaigns table

Permissions:
- GET: allow any (read-only for demo)
- POST/PUT/DELETE: IsAuthenticated + IsAdminOrReadOnly
"""

class RubricViewSet(viewsets.ModelViewSet):
    def list(self, request):
        """GET /api/v1/judge/rubric/ - List all rubrics with pagination"""
        pass

    def create(self, request):
        """POST /api/v1/judge/rubric/ - Create new scoring rubric"""
        pass

    def retrieve(self, request, pk=None):
        """GET /api/v1/judge/rubric/{id}/ - Get single rubric"""
        pass

    def update(self, request, pk=None):
        """PUT /api/v1/judge/rubric/{id}/ - Update existing rubric"""
        pass

    def destroy(self, request, pk=None):
        """DELETE /api/v1/judge/rubric/{id}/ - Delete rubric"""
        pass
```

**Expected Models (should already exist):**
```python
class ScoringRubric(models.Model):
    campaign_id = models.ForeignKey('quests.Quest', on_delete=models.CASCADE)
    teaching_value_weight = models.IntegerField(default=33)  # 0-100
    originality_weight = models.IntegerField(default=33)     # 0-100
    community_impact_weight = models.IntegerField(default=34) # 0-100
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
```

---

### 6. Admin Campaign CRUD Endpoints
**File:** `backend/apps/quests/views.py`

**Function Signatures:**
```python
"""
Implement a DRF viewset for Quest (Campaign) model

Endpoints needed:
- GET /api/v1/admin/campaigns/ - List all campaigns with filtering
- POST /api/v1/admin/campaigns/ - Create new campaign
- GET /api/v1/admin/campaigns/{id}/ - Retrieve campaign details
- PUT /api/v1/admin/campaigns/{id}/ - Update campaign
- DELETE /api/v1/admin/campaigns/{id}/ - Delete campaign

Query Parameters (filtering):
- ?status=active|ended|upcoming
- ?sort_by=created_at|start_date|contributor_count

Serialization:
- Input: { title, description, difficulty, reward_pool, start_date, end_date }
- Output: Same + { id, created_at, contributor_count, total_contributions, avg_score }

Permissions:
- GET list: IsAuthenticated + IsAdminUser
- POST/PUT/DELETE: IsAuthenticated + IsAdminUser

Validation:
- end_date must be after start_date
- difficulty must be one of: D, C, B, A, S
- reward_pool must be >= 0
- title must be unique
"""

class CampaignViewSet(viewsets.ModelViewSet):
    def list(self, request):
        """GET /api/v1/admin/campaigns/ - List campaigns (admin only)"""
        pass

    def create(self, request):
        """POST /api/v1/admin/campaigns/ - Create campaign"""
        pass

    def retrieve(self, request, pk=None):
        """GET /api/v1/admin/campaigns/{id}/ - Get campaign with stats"""
        pass

    def update(self, request, pk=None):
        """PUT /api/v1/admin/campaigns/{id}/ - Update campaign"""
        pass

    def destroy(self, request, pk=None):
        """DELETE /api/v1/admin/campaigns/{id}/ - Delete campaign"""
        pass
```

---

### 7. Contributions Admin List & Filter
**File:** `backend/apps/contributions/views.py`

**Function Signatures:**
```python
"""
Implement a DRF viewset for Contribution model (admin view)

Endpoints needed:
- GET /api/v1/admin/contributions/ - List all contributions with filtering
- GET /api/v1/admin/contributions/{id}/ - Get single contribution

Query Parameters (filtering):
- ?campaign_id={id} - Filter by campaign
- ?min_score={number} - Filter by minimum score
- ?max_score={number} - Filter by maximum score
- ?is_farming={true|false} - Filter by farming flag
- ?sort_by=score|created_at|user__wallet_address

Serialization:
- Output: { id, campaign_id, user, platform, content_text, content_url, scores, total_score, farming_flag, xp_awarded, created_at, scoring_metadata }
- Include user wallet address, not full user object (privacy)

Permissions:
- GET: IsAuthenticated + IsAdminUser

Validation:
- min_score and max_score must be integers 0-100
"""

class ContributionAdminViewSet(viewsets.ReadOnlyModelViewSet):
    def list(self, request):
        """GET /api/v1/admin/contributions/ - List contributions (admin only, with filtering)"""
        pass

    def retrieve(self, request, pk=None):
        """GET /api/v1/admin/contributions/{id}/ - Get contribution details"""
        pass
```

---

### 8. Admin Statistics Endpoint
**File:** `backend/apps/admin/views.py`

**Function Signature:**
```python
"""
Implement a single-endpoint stats aggregator for admin dashboard

Endpoint:
- GET /api/v1/admin/stats/ - Get aggregate statistics

Response structure:
{
  "total_campaigns": number,
  "active_campaigns": number,
  "total_contributions": number,
  "average_score": float,
  "total_xp_awarded": number,
  "unique_contributors": number,
  "farming_rate": float (0-1, fraction of contributions flagged as farming),
  "top_contributors": [
    { "wallet_address": "0x...", "total_xp": number, "contributions_count": number },
    ...
  ],
  "score_distribution": {
    "0_20": number,
    "21_40": number,
    "41_60": number,
    "61_80": number,
    "81_100": number,
  },
  "platform_breakdown": {
    "twitter": number,
    "discord": number,
    "github": number,
  },
}

Permissions:
- IsAuthenticated + IsAdminUser

Performance:
- Use Django ORM aggregation (Count, Avg, Sum)
- Cache results for 5 minutes (Redis)
- No N+1 queries
"""

@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdminUser])
def admin_stats(request):
    """GET /api/v1/admin/stats/ - Aggregate statistics for admin dashboard"""
    pass
```

---

### 9. Query Optimization for Leaderboard
**File:** `backend/apps/leaderboard/views.py`

**Function Signature:**
```python
"""
Optimize the leaderboard view to prevent N+1 queries

Current issue:
- For each user in leaderboard, separate query to get profile + contributions + scores
- 1 query for users + N queries for profiles = N+1 problem

Solution:
- Use select_related() for Profile (1:1 relationship)
- Use prefetch_related() for Contributions (1:N relationship)
- Annotate with aggregates (total_xp, contribution_count) instead of querying

Implementation:
- Update LeaderboardViewSet.get_queryset() with select/prefetch
- Add Count + Sum annotations to reduce database calls
"""

class LeaderboardViewSet(viewsets.ReadOnlyModelViewSet):
    def get_queryset(self):
        """
        Optimize queryset to prevent N+1 queries
        
        Expected query:
        SELECT u.*, p.*, COUNT(c.id) as contribution_count, SUM(c.total_score) as total_score
        FROM accounts_user u
        LEFT JOIN profiles_profile p ON u.id = p.user_id
        LEFT JOIN contributions_contribution c ON u.id = c.user_id
        GROUP BY u.id
        ORDER BY total_xp DESC
        
        This should result in 1 database query, not N+1
        """
        pass
```

---

## Summary Table

| # | Function | File | Priority | Est. Time |
|---|----------|------|----------|-----------|
| 1 | handleWalletError | ParticleWalletBridge.tsx | HIGH | 1–2 hrs |
| 2 | getFallbackWalletConnectors | ParticleWalletBridge.tsx | HIGH | 1–2 hrs |
| 3 | useAiJudge (enhanced) | useAiJudge.ts | MEDIUM | 2–3 hrs |
| 4 | CampaignRubricForm | CampaignRubricForm.tsx | HIGH | 2–3 hrs |
| 5 | RubricViewSet | judge/views.py | HIGH | 1–2 hrs |
| 6 | CampaignViewSet | quests/views.py | MEDIUM | 2–3 hrs |
| 7 | ContributionAdminViewSet | contributions/views.py | MEDIUM | 1–2 hrs |
| 8 | admin_stats endpoint | admin/views.py | MEDIUM | 1–2 hrs |
| 9 | get_queryset (optimized) | leaderboard/views.py | LOW | 0.5–1 hr |

**Total Estimated Time:** 12–20 hours of development

---

## Integration Checklist

After receiving implementations from the other AI:

- [ ] Function 1 integrated into ParticleWalletBridge.tsx
- [ ] Function 2 integrated into ParticleWalletBridge.tsx
- [ ] Function 3 integrated into useAiJudge.ts
- [ ] Function 4 integrated into CampaignRubricForm.tsx
- [ ] Function 5 integrated into judge/views.py (with ScoringRubricSerializer)
- [ ] Function 6 integrated into quests/views.py (with CampaignSerializer)
- [ ] Function 7 integrated into contributions/views.py (with ContributionSerializer)
- [ ] Function 8 integrated into admin/views.py
- [ ] Function 9 integrated into leaderboard/views.py
- [ ] Run frontend lint: `pnpm lint`
- [ ] Run frontend build: `pnpm build`
- [ ] Run backend tests: `pytest`
- [ ] Test locally: `docker compose up`
- [ ] Verify endpoints manually with Postman/curl

---

**Ready to pass to another AI.** After implementations come back, provide all files to me and I'll integrate + test.
