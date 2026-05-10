# AI(r)Drop Launch Sprint — May 10–24, 2026

## Overview
**Goal:** Ship AI(r)Drop MVP to production by May 24 (14 days).  
**Founder:** You (MBP + Ryzen Ollama setup, post-infra-setup phase).  
**Team:** Solo (you).  
**Definition of Done:** 5+ pilot DAOs running real campaigns, < 2s scoring latency, 0 critical bugs.

---

## Sprint Phases

### Phase 1: Launch Blockers (May 10–13, 3 days)
**Outcome:** Dynamic.xyz wallet UX production-ready.

**Blockers:**
- [ ] **Dynamic.xyz wallet connect flow** (3 days)
  - [ ] Review existing Dynamic.xyz integration in frontend
  - [ ] Test MetaMask → signature → JWT flow
  - [ ] Add error handling + network fallbacks (WalletConnect, Coinbase)
  - [ ] UI polish: loading states, error messages, retry logic
  - [ ] E2E test on testnet (Avalanche, Base)
  - Assigned to: You
  - Slack updates: Daily at EOD
  - Blocker for: Phase 2 (AI Judge config UI)

**Parallel:**
- [ ] **Review AI Judge scoring prompt** (2 days)
  - [ ] Load existing scoring rubric from CLAUDE.md / backend/judge/prompts.py
  - [ ] Test 3 sample tweets/contributions through Anthropic Claude + local Ollama
  - [ ] Measure latency + output quality
  - [ ] Identify any hallucinations or off-topic scores
  - [ ] Document baseline metrics for post-launch monitoring
  - Assigned to: You
  - Blocker for: Phase 2 (rubric config UI)

**Definition of Done for Phase 1:**
- Wallet connect works end-to-end on testnet (no manual JWT copy-paste).
- AI Judge scores a sample contribution in < 3s (Anthropic API).
- No console errors or unhandled promise rejections.
- Rubric baseline documented.

---

### Phase 2: Feature Sprint (May 13–17, 4 days)
**Outcome:** Campaign-specific scoring rubric UI + admin dashboard MVP.

**Tasks:**
- [ ] **Rubric config UI (3 days)**
  - [ ] Build form: campaign name, difficulty range, scoring weights (teaching_value / originality / community_impact)
  - [ ] Save rubric to Django backend (POST /api/v1/judge/campaigns/{id}/rubric/)
  - [ ] Load + display rubric on campaign detail page
  - [ ] Add "use global default" option for MVP (skip custom rubric for v1)
  - [ ] Test with 3 different rubrics
  - Assigned to: You
  - Depends on: Phase 1 (wallet connect)

- [ ] **Admin dashboard MVP (2 days)**
  - [ ] Campaign management: create, list, edit, delete
  - [ ] View contribution scores (paginated, sortable by score)
  - [ ] Download leaderboard as CSV
  - [ ] Monitor AI Judge task queue status (Celery)
  - [ ] Basic stats: # contributors, avg score, total XP awarded
  - Assigned to: You
  - Depends on: Rubric config UI

**Definition of Done for Phase 2:**
- Rubric config saved and retrieved without errors.
- Admin can create a campaign and view contributions.
- Leaderboard shows real scores (not mocked).
- No unhandled errors in Sentry.

---

### Phase 3: Testing & Hardening (May 17–19, 2 days)
**Outcome:** E2E flow tested, staging deployment ready.

**Tasks:**
- [ ] **E2E flow testing (1 day)**
  - [ ] Create test DAO wallet (testnet Avalanche / Base)
  - [ ] Connect wallet → sign message → get JWT
  - [ ] Create campaign via admin dashboard
  - [ ] Score 5 test contributions (via UI + API)
  - [ ] Check leaderboard reflects scores
  - [ ] Verify XP awarded to contributors
  - [ ] Test farmer detection flag (mark obvious spam)
  - Assigned to: You

- [ ] **Performance testing (1 day)**
  - [ ] Load test: 100 concurrent score requests
  - [ ] Latency SLA: p95 < 2s per score
  - [ ] Cache hit rates: measure Redis cache effectiveness
  - [ ] Identify bottlenecks; document post-launch optimization list
  - Assigned to: You

- [ ] **Staging deployment (0.5 days)**
  - [ ] Deploy backend to staging (docker-compose or Heroku)
  - [ ] Deploy frontend to Vercel staging
  - [ ] Configure Anthropic API key for staging
  - [ ] Smoke tests pass
  - Assigned to: You

**Definition of Done for Phase 3:**
- E2E flow works without manual intervention.
- Latency target met (p95 < 2s).
- Staging environment live and stable.
- Sentry + logging configured and working.

---

### Phase 4: Pilot DAOs (May 19–22, 3 days)
**Outcome:** 3–5 pilot DAOs running real campaigns, feedback collected.

**Tasks:**
- [ ] **Recruit pilot DAOs (1 day)**
  - [ ] Identify 3–5 DAOs from existing networks (Yurika portfolio? Guild? Your contacts?)
  - [ ] Cold outreach: problem pitch + early-access offer (free for pilot)
  - [ ] Secure 1 verbal commitment by May 19 EOD
  - Assigned to: You

- [ ] **Onboard pilot DAO #1 (1 day)**
  - [ ] Setup: create campaign, invite 10 test contributors
  - [ ] Run scoring on 20+ real contributions
  - [ ] Collect feedback: scoring accuracy, UX friction, feature requests
  - [ ] Monitor in real-time; fix bugs if discovered
  - Assigned to: You

- [ ] **Iterate based on feedback (1 day)**
  - [ ] Apply high-impact fixes (UX friction, scoring bugs)
  - [ ] Document lessons learned
  - [ ] Confirm other pilot DAOs ready to go
  - Assigned to: You

**Definition of Done for Phase 4:**
- 1+ pilot DAO has scored 50+ contributions.
- 0 critical bugs in production (minor UX nits OK).
- Feedback documented; prioritized for post-launch.
- 2+ additional DAOs committed to May 22 soft launch.

---

### Phase 5: Launch Prep (May 22–24, 2 days)
**Outcome:** Production deployment, public messaging, soft launch.

**Tasks:**
- [ ] **Production deployment (0.5 days)**
  - [ ] Deploy backend to production (Fly.io / Heroku / custom VPS)
  - [ ] Deploy frontend to Vercel production
  - [ ] Configure production Anthropic API key
  - [ ] Update DNS if needed
  - [ ] Smoke tests pass
  - Assigned to: You

- [ ] **Pre-launch comms (1 day)**
  - [ ] Prepare launch post (Twitter, Discord, maybe HN)
  - [ ] Prepare pilot DAO case studies (3-sentence success story each)
  - [ ] Prepare FAQ / docs (getting started, scoring mechanics, FAQ)
  - [ ] Set up Sentry alerts + incident escalation
  - Assigned to: You

- [ ] **Soft launch + monitoring (0.5 days)**
  - [ ] May 24, 10am: Deploy to production
  - [ ] May 24, 10:30am: Announce to pilot DAOs + Twitter
  - [ ] May 24–26: Monitor Sentry, respond to critical bugs
  - [ ] Celebrate 🎉
  - Assigned to: You

**Definition of Done for Phase 5:**
- Product live at airdrop.works
- 5+ pilot DAOs active
- 0 critical bugs in first 48h
- Post-launch roadmap documented

---

## Daily Standup Template (Use this 5 days/week)

```
**Date:** [May XX]
**Phase:** [1–5]

**What I finished yesterday:**
- [ ] Item 1
- [ ] Item 2

**What I'm working on today:**
- [ ] Priority 1 (blocker for X)
- [ ] Priority 2
- [ ] Priority 3 (nice-to-have)

**Blockers / Help needed:**
- Blocker? Yes / No
  - If yes: [describe]

**Confidence level:** [Low / Medium / High] that we hit the May 24 ship date.

**Notes:**
- [Any findings, learnings, or decisions?]
```

---

## Definition of Done Checklist (Final Gate)

Before **May 24 10am** launch:

- [ ] Wallet connect UX works end-to-end (MetaMask + WalletConnect tested).
- [ ] Campaign creation UI works (admin can create and save rubric).
- [ ] E2E scoring flow: wallet → campaign → contribute → score → leaderboard.
- [ ] Leaderboard displays real scores (no mocked data).
- [ ] AI Judge latency < 2s (p95).
- [ ] 3+ pilot DAOs have scored 50+ contributions each.
- [ ] 0 critical bugs in staging (minor UX nits documented for v1.1).
- [ ] Sentry + logging configured; alerts working.
- [ ] Production deployment tested on staging.
- [ ] Launch post written (Twitter, Discord, email).
- [ ] FAQ + getting-started docs published.
- [ ] Founder-market validation: 1+ DAO has committed to paying customer contract (post-pilot).

---

## Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-----------|--------|-----------|
| Anthropic API rate limits during pilot DAOs | High | Medium | Cache scores by content hash; batch during off-peak. Add Ollama fallback for non-critical flows. |
| Dynamic.xyz integration breaks on testnet | Medium | High | Add WalletConnect + Coinbase Wallet fallback. Test all three. |
| Scoring accuracy is bad (high false positives) | Medium | High | Iterate rubric with pilot DAO feedback. Use local Ollama for quick testing. |
| AI Judge scoring latency > 2s | Medium | Medium | Profile with local Ollama; optimize prompt structure. Cache aggressively. |
| Pilot DAOs drop out mid-sprint | Low | High | Recruit 5 interested DAOs upfront; only formalize 3. Backups ready. |
| You hit personal capacity wall | Low | High | Deprioritize admin dashboard polish (defer to v1.1). Focus on core 1-job: score contributions. |

---

## Revenue / Post-Launch

**Pilot pre-sales target:** $5–10K committed by May 24 (can be post-launch contracts).

**Pitch to pilot DAOs:**
> "We're shipping AI(r)Drop: quality-based airdrop scoring. You run a campaign, we score contributions using AI. Fair, transparent, no farming. We'll give you free access for the pilot; future pricing TBD but expect $1–5K/mo depending on campaign size."

**Post-launch actions:**
- [ ] Onboard 2–3 paying customers by June 7.
- [ ] Ship campaign-specific rubric customization (v1.1).
- [ ] Add Discord bot for contribution submission.
- [ ] Add automated farmer detection (machine learning, v1.2).

---

## Ollama Integration (Your Local Setup)

Use your MBP + Ryzen Ollama for:

1. **Local scoring testing:** Before hitting Anthropic API, test scoring logic on local Mistral 7B.
2. **Latency benchmarking:** Compare local Ollama vs Anthropic API on 100 contributions.
3. **Cost optimization:** If local model is accurate, consider hybrid: local for triage, Anthropic for edge cases.

**Setup:**
```bash
# On Ryzen machine, ensure Ollama is running
ollama pull mistral
ollama serve

# In Django backend, add feature flag
USE_LOCAL_OLLAMA=true  # dev
USE_LOCAL_OLLAMA=false # prod
```

---

## Success Metrics (Measure on Launch Day + 7 Days)

| Metric | Target | Actual |
|--------|--------|--------|
| Pilot DAOs active | 5+ | — |
| Contributions scored | 250+ | — |
| Avg scoring latency (p95) | < 2s | — |
| Errors in Sentry (critical) | 0 | — |
| Errors (non-critical) | < 5 | — |
| Website uptime | 99%+ | — |
| Pre-sales commitments | $5K+ | — |

---

## Commit Discipline (Git)

Per your CLAUDE.md (~/code):

**Commit pattern:**
```
feat(airdrop): <feature name>

- What changed
- Why it matters
- Testing done

Relates to: [Phase X, launch blocker Y]
```

**Never force-push to main.** Create feature branches; PR → review (self-review OK) → merge.

**Daily commit goal:** At least one clean, testable commit per day.

---

## Communication

**Slack / Discord:** Post daily standup EOD in `#ai-drop-sprint` (or DM yourself).

**GitHub Issues:** Create one issue per phase; update daily with blockers.

**Sentry alerts:** Configure to DM you on critical errors.

**Pilot DAO comms:** Weekly sync (or as needed). Collect feedback.

---

## Reference Links

- Existing CLAUDE.md (~/code/airdrop-works/CLAUDE.md) — Full tech stack + architecture.
- Backend repo: ~/code/airdrop-works/backend/
- Frontend repo: ~/code/airdrop-works/frontend/
- Audit findings: ~/code/borai/ops/ai-swarm-infra/NEXT_SAAS_AUDIT.md

---

**Sprint created:** May 10, 2026  
**Launch target:** May 24, 2026 (14 days)  
**Owner:** You  
**Status:** Ready to kick off

**Next action:** Start Phase 1 blockers tomorrow (May 11). Estimated Phase 1 completion: May 13 EOD.

Good luck! 🚀
