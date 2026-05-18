# AI(r)Drop Sprint Issues & Tracking

## Phase 1: Launch Blockers (May 10–13)
**Status:** COMPLETE  
**Owner:** You  
**Expected completion:** May 13 EOD

### Issue #1: Dynamic.xyz Wallet Connect UX
**Priority:** CRITICAL (blocks Phase 2)  
**Est. effort:** 3 days  
**Status:** IN PROGRESS

**Tasks:**
- [x] Review existing Dynamic.xyz integration (~/code/airdrop-works/frontend/src/providers/DynamicProvider.tsx)
- [ ] Test MetaMask → message signing → JWT flow on Avalanche testnet
- [x] Add error handling: network down, wallet rejected, signature timeout
- [x] Add network fallback: WalletConnect v2 + Coinbase Wallet (fallback list implemented)
- [ ] UI: loading spinners, error toasts, retry buttons
- [x] Unit tests: `handleWalletError()` + fallback connectors (frontend Vitest)
- [ ] E2E test: sign in → view profile → sign out (no errors)
- [ ] Deploy to staging; test on real mobile + desktop browsers

**Acceptance criteria:**
- User can connect wallet in < 5 seconds
- Error messages are clear (not technical jargon)
- Fallback wallets work if MetaMask unavailable
- JWT stored securely (httpOnly cookie)
- Zero console errors

**Blockers:** None identified yet

**Notes:**
- Check if Dynamic.xyz free tier supports custom branding (logo, colors)
- Confirm Avalanche + Base testnet chains work on Dynamic

---

### Issue #2: AI Judge Scoring Prompt & Baseline Testing
**Priority:** HIGH (blocks Phase 2 rubric config)  
**Est. effort:** 2 days  
**Status:** IN PROGRESS

**Tasks:**
- [ ] Load existing scoring prompt from `~/code/airdrop-works/backend/apps/judge/prompts.py`
- [ ] Test prompt on 5 diverse contributions: educational threads, code PRs, art posts, forum answers, memes
- [ ] Compare Anthropic Claude (production) vs local Ollama (Mistral 7B)
- [ ] Measure: latency, consistency, hallucination rate, output quality
- [ ] Document baseline metrics: avg score, score distribution, scoring agreement between models
- [ ] Identify edge cases: ambiguous posts, non-English, off-topic

**Acceptance criteria:**
- Baseline metrics documented
- Local Ollama latency < 5s per score
- Anthropic API latency < 2s per score
- Hallucination rate < 5% (spot-checked on 20 scores)
- Scoring agreement between local + Anthropic > 80% on numeric scores

**Blockers:** None identified yet

**Notes:**
- Use real tweets/Discord messages from pilot DAOs if possible
- Consider scoring variance: same input, different scores? Acceptable if < 10 points difference

---

## Phase 2: Feature Sprint (May 13–17)
**Status:** IN PROGRESS  
**Owner:** You  
**Expected completion:** May 17 EOD

### Issue #3: Campaign Rubric Config UI
**Priority:** CRITICAL (gates admin workflow)  
**Est. effort:** 3 days  
**Status:** BACKLOG

**Tasks:**
- [ ] Design form: campaign name, description, target difficulty (D–S), scoring weights (30% teaching + 40% originality + 30% impact)
- [ ] Implement form component in Next.js (shadcn/ui + Framer Motion)
- [ ] Connect to Django backend: POST /api/v1/judge/campaigns/{id}/rubric/
- [ ] Add "use global default rubric" toggle (MVP: always use global for v1.0)
- [ ] Display saved rubric on campaign detail page
- [ ] Validate: weights must sum to 100%, all numeric fields > 0
- [ ] Test: create 3 campaigns with different rubrics; verify scores respect weights

**Acceptance criteria:**
- Form renders without console errors
- Rubric saves to database
- Rubric retrieves correctly on campaign detail page
- Validation prevents invalid inputs
- Works on mobile + desktop

**Blockers:** 
- Depends on Issue #1 (wallet connect)

**Notes:**
- For v1.0, simplify: global rubric only. Custom rubrics → v1.1.
- Consider: should DAO members vote on rubric, or does founder set it?

---

### Issue #4: Admin Dashboard MVP
**Priority:** HIGH (nice-to-have for v1.0, not critical for v1.0.1)  
**Est. effort:** 2 days  
**Status:** BACKLOG

**Tasks:**
- [ ] Campaign management: list, create, edit, delete (CRUD)
- [ ] Contribution view: paginated list, sortable by score / date / farming flag
- [ ] Leaderboard export: download as CSV (user address, score, XP)
- [ ] Queue monitor: display Celery task status (pending, complete, failed)
- [ ] Stats dashboard: # contributors, avg score, total XP awarded, % farming flagged
- [ ] Search: filter contributions by contributor address or keyword

**Acceptance criteria:**
- Admin can create campaign in < 1 minute
- Admin can view 100+ contributions without lag
- CSV export includes all relevant columns
- Stats update in real-time
- No console errors

**Blockers:**
- Depends on Issue #3 (rubric config UI)

**Notes:**
- Keep it simple for MVP: single page, no fancy charts
- Charts + analytics → v1.1
- Restrict admin routes: check `is_admin` flag on User model

---

## Phase 3: Testing & Hardening (May 17–19)
**Status:** READY (after Phase 2)  
**Owner:** You  
**Expected completion:** May 19 EOD

### Issue #5: E2E Flow Testing
**Priority:** CRITICAL (gate production deployment)  
**Est. effort:** 1 day  
**Status:** BACKLOG

**Tasks:**
- [ ] Create test DAO wallet on Avalanche testnet (MetaMask + WalletConnect tested)
- [ ] E2E flow: connect → sign JWT → create campaign → score contributions → view leaderboard
- [ ] Scoring test: 5 manual contributions, verify scores appear in real-time
- [ ] XP tracking: confirm XP awarded to contributor profiles
- [ ] Farming detection: manually flag a spam post; verify "farming" badge appears
- [ ] Cleanup: delete test campaign; verify database consistency

**Acceptance criteria:**
- E2E flow completes without manual intervention
- All scores visible on leaderboard within 5 seconds
- No 404s, 500s, or unhandled errors
- Sentry captures no critical errors
- Database remains consistent (no orphaned records)

**Blockers:** None

---

### Issue #6: Performance Testing
**Priority:** HIGH (prevent production outages)  
**Est. effort:** 1 day  
**Status:** BACKLOG

**Tasks:**
- [ ] Load test: 100 concurrent scoring requests using Apache JMeter or k6
- [ ] Measure latency: p50, p95, p99 per request
- [ ] Monitor: CPU, memory, Redis hit rate on backend
- [ ] Identify bottleneck: DB queries, API calls, or serialization?
- [ ] Document results: avg latency, bottleneck, optimization list

**Acceptance criteria:**
- p95 latency < 2s per score request
- p99 latency < 5s
- Backend CPU < 80% under peak load
- Redis cache hit rate > 70%
- No timeouts or connection refusals

**Blockers:** None

**Notes:**
- If latency > 2s, profile code locally (Django Debug Toolbar)
- Consider: pre-compute scores for popular models? Batch processing?

---

### Issue #7: Staging Deployment
**Priority:** CRITICAL (final pre-prod gate)  
**Est. effort:** 0.5 days  
**Status:** BACKLOG

**Tasks:**
- [ ] Deploy backend (Docker Compose on staging server)
- [ ] Deploy frontend (Vercel staging environment)
- [ ] Configure Anthropic API key for staging (rate-limit to test key if available)
- [ ] Run smoke tests: login, create campaign, score, view leaderboard
- [ ] Configure Sentry + logging for staging
- [ ] Document deployment steps (for future devops automation)

**Acceptance criteria:**
- Staging environment is live and stable
- All smoke tests pass
- Sentry receives logs from staging
- Production data is NOT copied to staging (privacy)

**Blockers:** None

---

## Phase 4: Pilot DAOs (May 19–22)
**Status:** READY (after Phase 3)  
**Owner:** You  
**Expected completion:** May 22 EOD

### Issue #8: Recruit Pilot DAOs
**Priority:** CRITICAL (feedback before launch)  
**Est. effort:** 1 day  
**Status:** BACKLOG

**Tasks:**
- [ ] Identify 5 potential pilot DAOs (your network, Yurika portfolio, Twitter)
- [ ] Outreach: email / DM with problem pitch + early-access offer
- [ ] Secure 1 verbal commitment by May 19
- [ ] Secure 3 commitments by May 21
- [ ] Document DAO name, contact, # contributors, campaign type (airdrop, quest, grant)

**Acceptance criteria:**
- 3+ DAOs committed to running a campaign on staging
- Contact info + campaign details documented
- DAOs understand feedback will drive v1.1

**Blockers:** None

**Notes:**
- Pitch: "We're launching AI Judge for fair airdrop scoring. You get free pilot access; we get your feedback."
- Offer: free campaign scoring (normally $1–5K/mo)

---

### Issue #9: Onboard Pilot DAO #1
**Priority:** CRITICAL (validate core flow in production-like conditions)  
**Est. effort:** 1 day  
**Status:** BACKLOG

**Tasks:**
- [ ] Create campaign for DAO on staging
- [ ] Invite DAO to score 20+ real contributions
- [ ] Monitor scoring in real-time; fix bugs if discovered
- [ ] Collect feedback: accuracy, UX friction, feature requests
- [ ] Document learnings: what worked, what didn't

**Acceptance criteria:**
- 50+ contributions scored without critical errors
- Feedback collected in writing (email or Google Form)
- 0 critical bugs introduced
- Leaderboard reflects accurate scores

**Blockers:** 
- Depends on Issue #8 (pilot recruitment)

---

### Issue #10: Iterate & Validate
**Priority:** HIGH (validate across multiple DAOs before prod)  
**Est. effort:** 1 day  
**Status:** BACKLOG

**Tasks:**
- [ ] Review feedback from DAO #1
- [ ] Apply high-impact fixes (UX friction, scoring bugs)
- [ ] Prepare DAO #2 & #3 for soft launch
- [ ] Confirm all 3 DAOs ready to launch on May 24

**Acceptance criteria:**
- High-impact feedback addressed
- 0 new critical bugs introduced
- 2+ additional DAOs confirmed for May 24

**Blockers:**
- Depends on Issue #9 (DAO #1 feedback)

---

## Phase 5: Launch Prep (May 22–24)
**Status:** READY (after Phase 4)  
**Owner:** You  
**Expected completion:** May 24 10am

### Issue #11: Production Deployment
**Priority:** CRITICAL (ship day!)  
**Est. effort:** 0.5 days  
**Status:** BACKLOG

**Tasks:**
- [ ] Deploy backend to production (Fly.io / Heroku / custom VPS)
- [ ] Deploy frontend to Vercel production
- [ ] Configure production Anthropic API key
- [ ] Update DNS / domain (if airdrop.works not already live)
- [ ] Smoke tests: login, campaign, score, leaderboard

**Acceptance criteria:**
- Production environment is live
- All smoke tests pass
- Sentry + monitoring configured
- Backup & disaster recovery plan documented (post-launch)

**Blockers:** None

---

### Issue #12: Pre-Launch Communications
**Priority:** HIGH (convert pilot interest into adoption)  
**Est. effort:** 1 day  
**Status:** BACKLOG

**Tasks:**
- [ ] Write launch post (Twitter, Discord, maybe HN)
- [ ] Prepare 3 pilot DAO case studies (success stories)
- [ ] Write FAQ: how scoring works, how to use, pricing roadmap
- [ ] Write getting-started guide (5 min onboarding)
- [ ] Configure Sentry alerts + incident escalation

**Acceptance criteria:**
- Launch post is clear and compelling (< 280 chars for Twitter)
- FAQ covers top 10 questions (based on pilot feedback)
- Getting-started guide tested with non-technical user
- Incident response plan documented

**Blockers:** None

---

### Issue #13: Soft Launch & Monitoring
**Priority:** CRITICAL (be ready to react to bugs)  
**Est. effort:** 0.5 days (May 24 + follow-up)  
**Status:** BACKLOG

**Tasks:**
- [ ] May 24, 10am: Flip switch to production
- [ ] May 24, 10:30am: Announce to pilot DAOs + Twitter
- [ ] May 24–26: Monitor Sentry for critical errors; respond within 1 hour
- [ ] May 24–26: Monitor Slack / email for user complaints; triage + fix high-impact bugs
- [ ] May 26: Post-launch retrospective (what worked, what didn't, v1.1 ideas)

**Acceptance criteria:**
- 0 critical bugs left unfixed for > 1 hour
- 5+ active pilot DAOs on launch day
- Positive pilot feedback (NPS > 7/10, desired)
- Post-launch roadmap documented

**Blockers:** None

---

## Daily Status Log

**Use this to track daily progress. Copy & paste the template each day.**

### May 11 (Today)

**What I finished yesterday:**
- [x] Read audit findings

**What I'm working on today:**
- [ ] Start Issue #1: Dynamic.xyz wallet review
- [ ] Start Issue #2: AI Judge baseline testing

**Blockers / Help needed:**
- Blocker? No
- Notes: Dynamic.xyz free tier docs reviewed; ready to implement.

**Confidence level:** High (wallet connect is straightforward, no new dependencies)

**Next day plan:** Complete Issue #1 wallet error handling + fallback networks by EOD.

---

### May 12

**What I finished yesterday:**
- [ ] [Add your completed items]

**What I'm working on today:**
- [ ] [Add your priorities]

**Blockers / Help needed:**
- Blocker? Yes / No
- [Describe if yes]

**Confidence level:** [Low / Medium / High]

**Next day plan:** [What's the goal for tomorrow?]

---

*(Repeat for May 13–24)*

---

### May 18

**What I finished yesterday:**
- [x] Merged `chore/add-tests-ci` into `main` (frontend unit tests + backend integration tests)
- [x] Added frontend Vitest suite and `handleWalletError()` tests (23/23 passing locally)
- [x] Added backend integration test skeletons and ran them in Docker (21/21 passing)
- [x] Updated CI (`.github/workflows/ci.yml`) to run frontend build and backend pytest including `backend/tests/`
- [x] Added runbooks (`runbooks/leaderboard.md`, `runbooks/judge.md`) and payout batch skeleton (`backend/apps/rewards/management/commands/payout_batch.py`)

**What I'm working on today:**
- [ ] Finish remaining Phase 2 tasks: leaderboard operational runbook (done), on-chain payout pipeline (skeleton), Judge scaling (rate-limiter + credits enforcement verification), staging deploy + smoke tests
- [ ] Create E2E scripts for wallet connect flows (MetaMask + WalletConnect) and schedule handoff demo

**Blockers / Help needed:**
- No infra blockers — Docker Compose works locally. Need Anthropic/Twitter API keys for full E2E and account scoring tests.

**Confidence level:** High for infra & tests; medium for external API dependent tasks.

**Next day plan:** Complete Judge scaling checks (rate limiting + budget guard), add payout gas-estimate helper, and prepare staging smoke test checklist.

---

## Success Checklist (Gate Before May 24 10am Launch)

- [ ] Issue #1: Dynamic.xyz wallet UX DONE
- [ ] Issue #2: AI Judge baseline DONE
- [ ] Issue #3: Campaign rubric config DONE
- [ ] Issue #4: Admin dashboard MVP DONE
- [ ] Issue #5: E2E flow testing DONE
- [ ] Issue #6: Performance testing DONE (p95 < 2s)
- [ ] Issue #7: Staging deployment DONE
- [ ] Issue #8: Pilot DAO recruitment DONE (3+ DAOs)
- [ ] Issue #9: Pilot DAO #1 validation DONE
- [ ] Issue #10: Iteration + validation DONE
- [ ] Issue #11: Production deployment DONE
- [ ] Issue #12: Launch comms DONE
- [ ] Issue #13: Soft launch + monitoring ACTIVE

**All gates passed?** 
- Yes → Proceed to May 24 10am launch 🚀
- No → Address blockers before launch

---

**Last updated:** May 10, 2026  
**Next review:** May 11 EOD (after Issue #1 & #2 kick-off)
