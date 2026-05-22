# Product Features & Skills Sweep — Dangling Implementations

> Date: 2026-05-22  
> Scope: All product features, skills, gamification, and blockchain integrations

---

## Summary

| Category | Status | Critical Gaps |
|----------|--------|---------------|
| **Core Platform** | Mostly Complete | Appeals frontend, reputation UI |
| **Gamification** | Implemented | All 5 branches, loot, quests connected |
| **Blockchain** | Partial | Solana donations stub, contract wiring incomplete |
| **SPORE** | Feature-flagged | Phase 3 content generation is stub |
| **Notifications** | Local-only | No backend persistence, no push |

---

## Detailed Findings

### 1. Solana Donations — Dangling Stub ⭐ CRITICAL

**Location:** `frontend/src/hooks/useDonate.ts:45-54`

```typescript
// TODO: Phase 2 — Solana donations require @solana/web3.js and Dynamic SDK
const donateSolana = useCallback(async (_amountSol: string) => {
  setState({
    status: 'error',
    error: 'Solana donations are coming soon...',
  });
}, []);
```

**Gap:** Marketing page shows `/donate` with chain selector (Base/Solana), but Solana is hardcoded error.

**Impact:** User sees Solana option, selects it, gets error. Poor UX.

**Fix Options:**
- A) Hide Solana option until implemented
- B) Implement with `@solana/web3.js` + Dynamic SDK

---

### 2. Appeals Frontend — Missing Entirely ⭐ CRITICAL

**Backend:** Fully implemented (create, list, resolve, detail, throttling)

**Frontend:** Zero integration

**Missing:**
- `useAppeals()` hook for `/api/v1/integrity/appeals/me/`
- `useAppealSubmit()` hook for `POST /appeals/`
- `AppealForm` component (file appeal for farming flag)
- `MyAppeals` page or dashboard section
- Appeal status tracking in notifications

**Impact:** Contributors cannot dispute farming flags. Core Phase 5 feature invisible.

---

### 3. Reputation UI — Missing ⭐ HIGH

**Backend:** Complete (wallet bundle, history, portable export)

**Frontend:** No hooks or components

**Missing:**
- `useReputation(wallet)` for integrity bundle
- `useReputationHistory(wallet)` for timeline
- `ReputationCard` component (composite score, farming flag)
- `ReputationHistory` component (paginated contributions)
- Public profile page showing reputation

**Impact:** Portable reputation network is API-only. Users cannot view their own reputation.

---

### 4. SPORE Phase 3 — Feature-Flagged Stub ⭐ MEDIUM

**Location:** `backend/apps/spore/views.py:246-281`

```python
if not settings.SPORE_ENABLE_PHASE3:
    return Response(
        {"detail": "Phase 3 content generation is disabled"},
        status=status.HTTP_404_NOT_FOUND,
    )
# ... deterministic stub generation (SHA256-based, not LLM)
```

**Gap:** Brief generation uses hash-based fake data, not actual LLM generation.

**Current Behavior:** Returns `model: "phase3-stub-v1"` with deterministic mock concepts.

**Feature Flag:** `SPORE_ENABLE_PHASE3=false` (default)

**Impact:** SPORE Lab shows UI, but generation is fake. Users may not realize.

---

### 5. Notifications — Local-Only (No Backend) ⭐ MEDIUM

**Location:** `frontend/src/stores/useNotificationStore.ts` (Zustand, local state only)

**Gap:** Notifications are in-memory only. No:
- Backend persistence
- Database model
- Read/unread sync across devices
- Push notifications

**Impact:** User clears browser data = loses notifications. No cross-device sync.

---

### 6. Smart Contract Wiring — Incomplete ⭐ HIGH

**Contracts Deployed:** `InnovatorToken`, `ProfileNFT`, `CampaignEscrow`, `RewardDistributor`

**Backend Wiring:**
- `rewards/signer.py` — stub for signing transactions
- `rewards/payouts.py` — batch payout logic exists
- `rewards/tasks.py` — Celery tasks for execution

**Missing Integration:**
- No event listeners from contracts (The Graph subgraph not wired)
- No automatic minting on quest completion
- No on-chain reputation attestation
- Backend does not call contract functions

**Impact:** Contracts deployed but platform operates off-chain. Tokens not minted.

---

### 7. Referral System — Supabase-Only ⭐ LOW

**Current:** Reads from `waitlist_referral_counts` materialized view in Supabase.

**Gap:** No on-platform referral generation or tracking. Referral leaderboard is waitlist-only.

---

### 8. Skill Tree — Backend-Only ⭐ MEDIUM

**Current:** `skill_tree_state` JSON blob in Profile model. Nodes unlock with timestamp.

**Gap:** No XP calculation from contributions. Skill tree is static/manual, not automatic progression.

**Expected:** Contributions → XP → Automatic unlock suggestions.

---

### 9. Quest Completion Rewards — Stubbed

**Current:** Quest acceptance works. Loot chests can be created manually.

**Gap:** No automatic loot chest generation on quest completion.

---

### 10. Twitter Real-Time Feed — WebSocket Exists but Fragile

**Location:** `useTwitterFeed.ts`, `backend/apps/contributions/consumers.py`

**Current:** WebSocket feed exists, connects to Redis/Celery.

**Gap:** No E2E test coverage for live tweet ingestion. May break silently.

---

## Implementation Priority

### Immediate (This Week)
1. **Hide Solana donations** or implement basic Solana transfer
2. **Build `useAppeals()` + basic appeal form** — farming disputes are core value
3. **Build `useReputation()` + reputation card** — show composite score on dashboard

### Short Term (2 Weeks)
4. **Implement real SPORE Phase 3** — wire LLM generation behind feature flag
5. **Add notifications backend** — simple PostgreSQL table + polling
6. **Contract event listeners** — subgraph or webhook for mint events

### Medium Term (Month)
7. **Automatic quest rewards** — loot chest on quest completion
8. **XP auto-calculation** — skill tree progression from contributions
9. **Cross-device notification sync** — full backend persistence

---

## Code References

| Feature | Frontend | Backend | Status |
|---------|----------|---------|--------|
| Solana Donations | `useDonate.ts:45-54` | N/A | Stub |
| Appeals | N/A | `appeals_views.py` | Backend only |
| Reputation UI | N/A | `reputation_portable.py` | Backend only |
| SPORE Phase 3 | `spore-lab/page.tsx:568` | `views.py:246-281` | Stub |
| Notifications | `useNotificationStore.ts` | N/A | Local only |
| Contract Events | N/A | `rewards/signer.py` | Stub |
| Skill Tree XP | `skill-tree/page.tsx` | `views.py:35-55` | Manual only |
