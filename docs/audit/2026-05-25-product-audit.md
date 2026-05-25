# AI(r)Drop Product Audit — 2026-05-25

**Scope:** Strategic product audit across platform readiness dimensions.  
**Method:** Codebase + docs review (no implementation).  
**Repo ref:** `main` @ 0.9.0 (2026-05-25).

---

## Audit remediation waves (status)

Parallel remediation tracks from the 2026-05-25 audit. **Wave 2D** (this pass) completes Sections 2 & 4 below.

| Wave | Goal | Tracks | Status |
|------|------|--------|--------|
| **1** | Unblock revenue + critical auth | 1A merge backend parity · 1B merge UI · 1C Stripe wire · 1D Open App → `postAuthPath` | **Complete** (merged to `main`) |
| **2** | Complete funnel (waitlist → app) | 2A waitlist wallet-optional UI · 2B `/signup` email/social paths · 2C env/API canonical URLs · **2D audit doc + env docs** | **In progress** (2D this commit; 2A–2C may still be open) |
| **3** | QA, gating, B2B hygiene | 3A Playwright auth matrix · 3B onboarding localStorage · 3C `/workspace/setup` gate · 3D UX polish | *Pending* |
| **4** | Speed to first paying customer | 4A Integrity pilot kit · 4B demo → upsell · 4C pay-first gate | *Pending* |

> Findings in Sections 2 & 4 reflect the **pre–Wave 1 code review** (2026-05-25). Cross-check the wave table above before treating a gap as still open.

---

## Executive Summary

AI(r)Drop has **two monetization engines implemented in backend code** but **neither is fully sellable from the public funnel today**:

1. **PLG (per-user AI Judge credits)** — Stripe models, webhooks, credit metering, and in-app usage UI exist; pricing page and upgrade CTAs still route to the **waitlist**, not checkout.
2. **B2B (SPORE tenant subscriptions + API keys)** — Starter/Growth/Enterprise Stripe billing, tenant provisioning, quotas, and API key management exist; surfaces are **staff-only** and disconnected from marketing.

The **fastest path to first revenue** is not new product—it is **closing the conversion gap**: wire existing Stripe checkout, fix billing UI bugs, and run the **Campaign Integrity Pilot** as a manual high-ACV offer while PLG self-serve matures. Production `airdrop.works` is still **waitlist-first** per `docs/qa-and-user-flow.md`; signup whitelist gating blocks self-serve login even when billing is configured.

**Top 5 revenue accelerators (impact ÷ effort):**

| Rank | Feature | Horizon |
|------|---------|---------|
| 1 | Wire PLG Stripe checkout (pricing → pay, fix portal bug) | Quick win (<1 week) |
| 2 | Campaign Integrity Pilot sales kit + invoicing | Quick win (<1 week) |
| 3 | Pay-first / soft signup gate for Pro buyers | Quick win (<1 week) |
| 4 | Public B2B tenant + Judge API onboarding | Medium (2–4 weeks) |
| 5 | Demo → account upsell (cap free demo, post-score CTA) | Quick win start / medium finish |

**Competitive context:** Quest platforms (Galxe Business+, Zealy Standard ~$149–549/mo) sell **distribution + task completion**. AI(r)Drop’s differentiated sell is **content-quality scoring + farming detection** (second layer after Passport)—but buyers currently discover that only via a **free unlimited landing demo**, not a purchasable SKU.

---

## Audit Sections (index)

| # | Section | Status |
|---|---------|--------|
| 1 | Product–market fit & positioning | *Pending* |
| **2** | **Logical flow & auth (code-level)** | **Complete 2026-05-25** |
| 3 | UX & conversion funnel | **UI/UX + Optimization (live audit)** |
| **4** | **Missing spec implementations (S1–S8)** | **Complete 2026-05-25** |
| **5** | **Speed to first paying customer** | **Complete 2026-05-25** |
| 6 | Go-to-market & content | *Pending* |
| 7 | Ops & observability | *Pending* |

---

## 2 — Logical flow & auth (code-level)

**Method:** Spec/docs vs implementation review (`.claude/team-of-three-specs/s1–s8`, `docs/qa-and-user-flow.md`, auth/onboarding/waitlist/payments code). No live browser pass.

### Top 10 gaps by severity

| Rank | Gap | Severity | Wave track |
|------|-----|----------|------------|
| 1 | **S6 identity merge only enforced on GitHub** — Twitter/Discord/Telegram still issue JWT on email collision; orphan social users created | **Critical** | 1A |
| 2 | **No `/login` UI for merge flows** — no handling of `merge=confirmed`, `merge=pending`, `merge=error`; email OTP 409 `mergeRequired` not surfaced | **Critical** | 1B |
| 3 | **Waitlist UI still wallet-mandatory** — API accepts optional wallet but `WaitlistForm` blocked submit without wallet; conflicts with S1 | **High** | 2A |
| 4 | **`MarketingAuthActions` “Open App” → `/dashboard`** — skips `postAuthPath()` / onboarding for social-only JWT holders | **High** | 1D |
| 5 | **Approved waitlist → signup was wallet-only** — no email/social path on `/signup` | **High** | 2B |
| 6 | **`/workspace/setup` exposed to all authed users** — sidebar link + `IsAuthenticated` only; no staff/B2B buyer gate | **High** | 3C |
| 7 | **Merge confirm proxy `BACKEND_URL` default `:8000`** vs Docker/QA `:8001` — merge email links can fail locally | **High** | 2C / 2D |
| 8 | **S8 E2E coverage thin** — Vitest auth-flow exists; Playwright has waitlist + auth-guard smoke only | **Medium** | 3A |
| 9 | **Dual onboarding state** — `postAuthRedirect` localStorage `onboarding_completed` never set by `/onboarding` | **Medium** | 3B |
| 10 | **Pricing → waitlist; dashboard billing `res.url` vs `portal_url`** — PLG checkout not wired | **Medium** | 1C |

### Auth paths (wallet / email / 5 social)

| Finding | Severity | File / Evidence | Recommendation |
|---------|----------|-----------------|----------------|
| Email OTP → Django JWT works; merge blocked with 409 | Low (intended) | `backend/apps/accounts/views.py` `EmailVerifyView`; `frontend/src/hooks/useEmailAuth.ts` | Surface 409 in `EmailLoginSection` (“check inbox to link accounts”) |
| Email merge confirm → redirect with JWT query params | Low | `frontend/src/app/api/auth/merge/confirm/route.ts` | Parse `merge=confirmed&access=…` on `/login` and call `applySession` |
| GitHub blocks JWT when merge required | Low | `backend/apps/accounts/github_views.py` L166–170 | Mirror in Twitter/Discord/Telegram callbacks |
| Twitter/Discord login still redirects with JWT when email matches wallet account | **Critical** | `twitter_views.py` L177–179; `discord_views.py` L181–183 — no `merge_required` check | Same as GitHub: redirect `/login?merge=pending&email=`; do not issue JWT |
| Telegram has no merge path in callback | **High** | `telegram_views.py` — no merge grep | Add merge check in Telegram login completion |
| Social merge creates new user *before* merge email | **High** | `social_login_helpers.py` `resolve_social_user` L72–93 | Block JWT / defer user creation until confirm, or delete orphan on pending |
| Wallet SIWE auto-marks `onboarding_completed` | Low (by design) | `views.py` WalletVerifyView L108–111 | Document; wallet users skip S7 |
| Dev login forces `/dashboard` via `setPostAuthDestination` | Low | `login/page.tsx` L89 | OK for QA superadmin (has wallet) |
| Telegram poll hits raw backend URL (CORS/env) | **Medium** | `useSocialLogin.ts` L7–8, L61–63 | Use same-origin `/api/v1/…` rewrite like other auth calls |
| All 5 social + email + wallet visible on `/login` | ✅ Done | `SocialLoginButtons.tsx`, `EmailLoginSection.tsx`, `WalletButton` | — |

### Waitlist → signup → login → onboarding → dashboard

| Finding | Severity | File / Evidence | Recommendation |
|---------|----------|-----------------|----------------|
| Waitlist success CTAs → `/signup` + `/login` | ✅ Done | `StepSubmit.tsx` L133–145 | — |
| Waitlist API allows optional wallet | ✅ Backend | `api/waitlist/route.ts` L91–93 | Align UI |
| Waitlist UI requires wallet for step 4 | **High** | `WaitlistForm.tsx` L49, L169 `walletAddress && email` | Add skip-wallet path or reorder steps per S1 |
| `/signup` = whitelist email + wallet SIWE only | **High** | `signup/page.tsx` — no email OTP/social (at audit time) | Extend approved entry to `/login` methods (Wave 2B) |
| `/login` post-auth uses `postAuthPath(user)` | ✅ Done | `lib/onboarding.ts`, `login/page.tsx` L82 | — |
| `AuthGuard` enforces onboarding for wallet-less incomplete profiles | ✅ Done | `AuthGuard.tsx` L66–78 | — |
| Landing “Open App” bypasses onboarding | **High** | `MarketingAuthActions.tsx` L51 — always `/dashboard` (at audit time) | Use `postAuthPath(user)` (Wave 1D) |
| Onboarding persists skip/complete to backend | ✅ Done | `onboarding/page.tsx` PATCH `/auth/me/` | Call `markOnboardingComplete()` or drop unused localStorage branch |
| QA doc §7.3 signup = wallet only | Doc drift | `docs/qa-and-user-flow.md` §7.3 vs S5 six providers | Update QA matrix (Wave 2D) |

### Identity merge

| Finding | Severity | File / Evidence | Recommendation |
|---------|----------|-----------------|----------------|
| Backend merge service + tests | ✅ Done | `merge_service.py`, `test_identity_merge.py` | — |
| Frontend merge confirm route | Partial | `api/auth/merge/confirm/route.ts` | Login page must consume redirect params |
| Login page merge UI | **Critical** | `login/page.tsx` — no `merge` searchParams handling (at audit time) | Add pending/confirmed/error states per QA_GUIDE §Identity merge (Wave 1B) |
| Social merge UI (`merge=pending`) | **Critical** | Only GitHub redirects; no UI handler (at audit time) | Show “check email” + block session |

### Judge demo & account score gating

| Finding | Severity | File / Evidence | Recommendation |
|---------|----------|-----------------|----------------|
| Account score hidden until waitlist or demo tried | ✅ Done | `canShowAccountScore.ts`, `WaitlistForm` `markWaitlistJoined`, `AiJudgeDemo` `markJudgeDemoTried` | — |
| Full account score requires auth | ✅ Done | `TwitterAnalyzer.tsx` L49–51 → `buildAccountScoreLoginUrl()` | — |
| Login shows account-score message | ✅ Done | `login/page.tsx` L26–28, `ACCOUNT_SCORE_LOGIN_MESSAGE_KEY` | — |
| Landing demo unlimited vs paid credits split | **Medium** | `AiJudgeDemo` → `/api/judge`; app → Django credits | Post-score CTA to signup (Section 5) |
| `postAuthReturnPath` for `#twitter-analyzer` | ✅ Done | `login/page.tsx` L43–47, `consumePostAuthReturnPath` | E2E test return-after-login (Wave 3A) |

---

## 4 — Missing spec implementations (S1–S8)

| Spec | Title | Status at audit | File / Evidence | Remaining work |
|------|-------|-----------------|-----------------|----------------|
| **S1** | Wallet-optional User | ✅ Done | `models.py` `USERNAME_FIELD = "username"` | Waitlist UI optional wallet (2A) |
| **S2** | Email OTP → JWT | ✅ Done | `EmailVerifyView`, `useEmailAuth.ts` | Handle merge 409 in UI (1B) |
| **S3** | Social primary auth | **Partial** | Tests pass; merge inconsistent on callbacks | Finish merge parity (1A) |
| **S4** | GitHub OAuth | ✅ Done | `github_views.py`, env in `.env.example` | — |
| **S5** | Login UI + landing bridge | **Partial** | Login/signup CTAs OK; Open App onboarding gap | Fix `MarketingAuthActions` (1D) |
| **S6** | Resend identity merge | **Partial** | Backend done; 3/4 social + frontend incomplete | Complete S6 (1A + 1B) |
| **S7** | Onboarding | ✅ Done | `onboarding/page.tsx`, `AuthGuard`, profile fields | Wire localStorage or remove dead code (3B) |
| **S8** | Vitest + QA docs | **Partial** | `auth-flow.test.tsx`; QA docs updated; no Playwright auth matrix | Add e2e journeys (3A) |

### Spec checklist (detail)

| Finding | Severity | Spec / Doc | File / Evidence | Recommendation |
|---------|----------|------------|-----------------|----------------|
| S1 wallet-optional User model | ✅ Done | s1 | `models.py` | — |
| S2 email OTP → JWT | ✅ Done | s2 | `EmailVerifyView`, `useEmailAuth.ts` | Handle merge 409 in UI |
| S3 social primary auth | **Partial** | s3 | Tests pass; merge inconsistent on callbacks | Finish merge parity |
| S4 GitHub OAuth | ✅ Done | s4 | `github_views.py`, env in `.env.example` | — |
| S5 login UI + landing bridge | **Partial** | s5 | Login/signup CTAs OK; Open App onboarding gap | Fix `MarketingAuthActions` |
| S6 Resend merge | **Partial** | s6 | Backend done; 3/4 social + frontend incomplete | Complete S6 |
| S7 onboarding | ✅ Done | s7 | `onboarding/page.tsx`, `AuthGuard`, profile fields | Wire localStorage or remove dead code |
| S8 vitest + QA docs | **Partial** | s8 | `auth-flow.test.tsx`; no Playwright auth matrix | Add e2e journeys per QA_GUIDE |
| Waitlist wallet-optional (S1 parent) | **Not done (UI at audit)** | `qa-and-user-flow.md` §2.3 | API optional, UI mandatory | Update doc + UI together (2A) |
| Wallet UX polish (gas, claim CTA) | **Not done** | `wallet-ux-polish.md` | `LootChest.tsx` optimistic open | Tickets 002–004 |
| `/signup` back link → `/pricing` not home | Low | S5 cross-links | `signup/page.tsx` L93 | Align with “Enter via signup” from login |

### Broken / incomplete wiring

| Finding | Severity | File / Evidence | Recommendation |
|---------|----------|-----------------|----------------|
| Merge confirm uses `BACKEND_URL` default `:8000` | **High** | `merge/confirm/route.ts` L8; `next.config.ts` L27–28; QA uses `:8001` | Single canonical backend port in `.env.example` (2D) |
| Telegram poll bypasses Next rewrite | **Medium** | `useSocialLogin.ts` direct `fetch(BACKEND_URL…)` | Route via `/api/v1/auth/telegram/login/poll/` (2C) |
| `/workspace/setup` → Stripe checkout fails silently → `/spore-lab` | **Medium** | `workspace/setup/page.tsx` L52–59 catch | Show billing-unconfigured state; gate route (3C) |
| No `is_staff` / tenant check on workspace setup UI | **High** | `AppSidebar.tsx` L32; `SporeTenantsView` `IsAuthenticated` only | Hide from non-buyers or require staff/plan (3C) |
| Dashboard billing portal field mismatch | **Medium** | `dashboard/page.tsx` L96–97 expects `url`; settings uses `portal_url` | Align with API response (1C) |
| Pricing CTAs → waitlist not checkout | **High** | `pricing/page.tsx` L25,44,63 | Wire `user-checkout` (1C) |
| `RESEND_API_KEY` optional for waitlist + required for merge | **Medium** | waitlist route; `merge_service.send_merge_confirmation_email` | Document merge as blocked without Resend |
| OAuth providers unset → social buttons fail at runtime | **Medium** | `.env.example` `GITHUB_*`, `DISCORD_*`, etc. | Feature-flag or disabled state on `/login` |

### Release / QA blockers (from code review)

1. **Merge flow broken end-to-end for 4 of 5 social providers** + no frontend merge UX → S6 not shippable (Wave 1).
2. **`RESEND_API_KEY` + Redis** required for merge emails/tokens; silent failure if missing.
3. **Supabase + per-provider OAuth env** required for full auth matrix in `QA_GUIDE.md` §Auth Provider Matrix.
4. **Waitlist `approved` column** must be set in Supabase for `/signup` happy path — no auto-approve on payment (Wave 4C).
5. **Production scope mismatch:** `qa-and-user-flow.md` v1 = waitlist-only live on `airdrop.works`; §7 app auth matrix documents flows validated on staging/local only.

*Section 2 & 4 completed 2026-05-25 (code-level audit).*

---

## Speed to First Paying Customer

### Current monetization surface (what can be sold today)

| SKU | Price (code/spec) | Backend | Frontend / GTM | Sellable today? |
|-----|-------------------|---------|----------------|-----------------|
| **Free AI Judge** | $0 · 10 credits/mo | `UserSubscription` + `deduct_credit()` on `/api/v1/judge/score/` | Dashboard + `/judge` show credits; free tier seeded on signup | Yes (usage-limited) |
| **Pro** | $29/mo · 200 credits | `UserCheckoutView` → Stripe subscription; webhook sync | `/pricing` CTAs → **waitlist**; no checkout button in app | **No** (infra only) |
| **Team** | $99/mo · 1,000 credits + “API access” (marketing copy) | Same as Pro | Same gap; no public API key UX for judge | **No** |
| **Credit packs** | 50/$9 · 200/$29 | One-time Stripe checkout via `user-checkout` | Pricing page → waitlist | **No** |
| **SPORE Starter** | $99/mo | Tenant `Subscription` + daily quotas | `/settings` tenant billing + `/workspace/setup` | **Partial** (requires auth + tenant; staff path) |
| **SPORE Growth** | $499/mo | Same | Same | **Partial** |
| **SPORE Enterprise** | Custom | Price ID in env | Contact-style; checkout button exists in settings | **Partial** |
| **Campaign Integrity Pilot** | Quoted per campaign | Integrity API, CSV export, protocol console (`/console`) | Landing section + waitlist `?intent=campaign_integrity_pilot` | **Yes (manual/services)** |
| **White-label quest campaigns** | Spec / marketing copy | `Quest` model, quest board UI, on-chain stubs | No tenant-branded campaign builder or external operator portal | **No** (demo chrome) |
| **Donations** | Voluntary | On-chain Base + Solana | `/donate` marketing page | Tip jar only, not SaaS |

**Built vs demo-only**

| Surface | Built (production-capable) | Demo-only / stub |
|---------|---------------------------|------------------|
| Landing AI Judge | `POST /api/judge` (Next.js → Anthropic stream, IP rate limit) | No auth, no credits, no persistence |
| App AI Judge | Django score + Contribution row + XP + credits | Falls back to heuristic when credits exhausted |
| Twitter account analysis | Backend `score-account` (5 credits) | Pro-gated in UI; needs `TWITTER_BEARER_TOKEN` |
| Quest board / loot / skill tree | Models + UI | On-chain rewards not wired; XP progression partly manual |
| SPORE graph / briefs | Tenant API keys, metering, quotas | Phase 3 brief generation is hash stub (`SPORE_ENABLE_PHASE3=false`) |
| Integrity / reputation | API + console + appeals (Phase 5) | Public wallet bundle; export/allocate staff-only |
| Comparison / positioning | `ComparisonSection` vs Kaito/Galxe | Claims “white-label + custom AI”—not productized |

### Conversion funnel (as implemented)

```mermaid
flowchart LR
  subgraph marketing [Marketing - live on airdrop.works]
    LP[Landing /]
    Demo[AiJudgeDemo - free /api/judge]
    WL[Waitlist 4-step quest]
    Price[/pricing]
  end
  subgraph app [App - requires approved signup]
    SU[/signup whitelist check]
    Login[/login SIWE]
    Onb[Onboarding]
    Dash[/dashboard]
    Judge[/judge credits]
    Set[/settings billing]
  end
  subgraph b2b [B2B - staff-heavy]
    WS[/workspace/setup]
    SL[/spore-lab API keys]
    PC[/console integrity]
  end
  LP --> Demo
  LP --> WL
  Price --> WL
  Demo --> WL
  WL --> SU
  SU -->|approved| Login
  Login --> Onb --> Dash
  Dash --> Judge
  Dash -->|Upgrade| Price
  Set -->|tenant Stripe| StripeT[Stripe Checkout]
  WS --> StripeT
  Judge -->|no credits| Price
```

**Funnel friction points**

- **Production scope:** `docs/qa-and-user-flow.md` states only the waitlist landing is live on `airdrop.works`; full app is staging/local.
- **Double dead-end on upgrade:** `/pricing` and dashboard “Upgrade” both send users back to waitlist, not `POST /payments/user-checkout/`.
- **Signup gate:** `/signup` requires waitlist email approval before wallet login—blocks pay-first PLG.
- **Billing bug:** Dashboard `handleManageBilling` expects `res.url` but API returns `{ portal_url }`—portal silently fails.
- **Split brain:** Marketing demo uses Next.js route; paid app uses Django—scores don’t carry over into account history.

### Competitor positioning (marketing + research)

| Competitor | Their monetization | AI(r)Drop positioning in copy |
|------------|-------------------|-------------------------------|
| **Galxe** | Quest distribution, Business+ subscription, Earndrop, Passport/Score | “Task completion” vs our “AI quality analysis”; “bots rank > humans” |
| **Kaito** | Dead (Jan 2026) | Engagement metrics failed; cautionary tale |
| **Zealy** | Free → Standard ~$149–199/mo → Plus ~$359–549/mo | Modular quests; we claim deeper content rubric |
| **Layer3** | Token-staked task publishing | On-chain attention tasks; research notes embed-judge-as-API wedge |
| **Human Passport** | Identity / Sybil | Complementary: “Passport filters humans; we filter farmers” |

Research consensus (`research/airdrop-direction/`): **platform BD to Galxe/Layer3** (embed judge API) may outperform cold protocol outreach—but **not tested in repo**. Grok cold take: “AI Judge demo is a feature, not a company” unless embedded in existing quest platforms.

### Gaps blocking revenue

| Gap | Impact | Evidence |
|-----|--------|----------|
| Pricing page not connected to Stripe | High | All plan CTAs → `/#waitlist` (`frontend/src/app/(marketing)/pricing/page.tsx`) |
| No in-app Pro/Team/credit-pack checkout | High | Backend `user-checkout/` exists; no UI calls it |
| Waitlist approval required for app access | High | `frontend/src/app/signup/page.tsx` + `checkWhitelistApproval` |
| Dashboard billing portal response mismatch | Medium | `res.url` vs `portal_url` in `dashboard/page.tsx` |
| Stripe env not documented as production-ready | Medium | Empty price IDs in `.env.example` |
| Two billing mental models (user vs tenant) | Medium | Settings = tenant SPORE; dashboard = user credits—confusing for buyers |
| Team “API access” undelivered in UX | Medium | SPORE API keys exist but staff-only; no judge API keys for Team plan |
| White-label / quest campaigns for projects | High (enterprise) | Quest model lacks tenant/project FK; marketing overclaims |
| Free demo unlimited relative to paid | Medium | 10 req/min IP limit only; no account creation pressure |
| On-chain rewards in comparison table | Low (trust) | Loot/NFT rewards marketed; contracts not wired to payouts |
| SPORE Phase 3 stub | Medium (B2B) | Brief generation fake when flag off |

### Prioritized top 5 features (impact ÷ effort)

#### 1. Wire PLG Stripe checkout end-to-end — **Quick win (<1 week)**

**What:** Connect `/pricing`, dashboard “Upgrade”, and judge “buy credits” to `POST /api/v1/payments/user-checkout/` and `user-portal/`. Fix `portal_url` bug. Set production Stripe price IDs and webhook endpoint.

**Why:** Backend, models, webhooks, and credit enforcement are done—this is almost entirely frontend + env. Highest leverage per line of code.

**Effort:** S · **Impact:** Highest for first recurring PLG dollar.

#### 2. Campaign Integrity Pilot — sales kit + payment rails — **Quick win (<1 week)**

**What:** Package existing deliverables (`docs/campaign-integrity-pilot.md`, integrity export, console) with Stripe Invoice or Payment Link, one-pager PDF, and calendared delivery SOP. Tag waitlist `source=campaign_integrity_pilot` leads in outbound.

**Why:** B2B pilots fit pre-TGE budget cycles (8–16 weeks before snapshot); no dependency on self-serve quest product. Integrity API + CSV export already defensible.

**Effort:** S (process) · **Impact:** Highest ACV per deal; validates pricing before PLG scales.

#### 3. Pay-first / soft signup gate — **Quick win (<1 week)**

**What:** Allow Stripe checkout success (or magic link) to bypass waitlist approval; or auto-approve waitlist rows on successful payment webhook.

**Why:** Current funnel optimizes for lead capture, not revenue. A paying Pro user should never hit “not approved.”

**Effort:** S · **Impact:** Unblocks entire PLG motion in production.

#### 4. Public B2B tenant + Judge API onboarding — **Medium (2–4 weeks)**

**What:** Customer-facing “For Projects” page (Starter $99 / Growth $499), self-serve `/workspace/setup` in main nav for verified buyers, published API docs for batch scoring + integrity export, API keys without staff flag.

**Why:** Matches comparison-table promise (“white-label + custom AI”) at Zealy-competitive price points. SPORE tenant billing + API keys + quotas already exist—needs GTM packaging and judge API exposed as metered product (not only graph query).

**Effort:** M · **Impact:** First $99–499/mo B2B subscriptions; foundation for Galxe/Layer3 embed conversations.

#### 5. Demo → authenticated upsell — **Quick win start / medium finish (1–4 weeks)**

**What:** (a) Post-score CTA on `AiJudgeDemo`: “Save score + get 10 free credits” → wallet signup. (b) Tighter demo rate limits + messaging when limit hit. (c) Optional: persist demo scores to account on login via content hash.

**Why:** Free demo is the top-of-funnel converter but currently leaks value with no account hook. Closes landing → login → paid loop without new backend primitives.

**Effort:** S–M · **Impact:** Improves conversion rate on existing traffic.

### Quick wins vs medium term

| Horizon | Items |
|---------|--------|
| **<1 week** | Stripe PLG checkout + portal fix; production Stripe products/prices/webhook; pay-first signup bypass; pilot invoice + outbound to tagged waitlist leads; hide or fix misleading CTAs until checkout live |
| **2–4 weeks** | B2B self-serve tenant page + judge API docs; integrity console skin for sales demos; demo→account upsell with persistence; Team plan API keys tied to judge endpoints; usage emails (credits low, renewal) |
| **>4 weeks (not required for first dollar)** | White-label quest campaigns; on-chain reward wiring; SPORE Phase 3 real briefs; Galxe/Layer3 partnership embed; open rubric / data coop (Phase 4 roadmap) |

### Recommended first-dollar sequence

1. **Week 1:** Ship PLG checkout + fix billing bugs + pay-first gate → first Pro subscriber possible.
2. **Parallel:** Close 1–2 **Campaign Integrity Pilots** manually from waitlist intent leads (highest confidence revenue).
3. **Weeks 2–4:** Productize B2B tenant path for inbound protocols; use console + CSV export in sales calls.
4. **Measure:** Time from landing demo → paid; waitlist → paid conversion; pilot lead → closed-won; credits consumed vs purchased.

---

*Sections 2, 4, 5, UI/UX, and Optimization completed 2026-05-25. Sections 1, 6, 7 pending.*

---

## UI/UX

**Audit method:** Live browser pass via Cursor IDE Browser MCP on `http://localhost:3002` (dev server restarted for session). Mobile viewport emulated at 390×844. Screenshots captured to `/tmp/cursor/screenshots/` (e.g. `page-2026-05-25T19-00-12-503Z.png` hero desktop, `page-2026-05-25T19-01-20-980Z.png` login mobile).  
**Blockers:** `https://airdrop.works` unreachable from audit browser (`chrome-error://chromewebdata/`). Initial dev on `:3011` crashed with `supabaseUrl is required` before env-loaded server on `:3002` was used. Production parity not verified in this pass.

### Landing `/` — hero, nav, demo, privacy

| Area | Finding | Severity | Snapshot note |
|------|---------|----------|---------------|
| **Hero marquee** | Six columns of scrolling Twitter avatars (`HeroMarquee`) are decorative (`aria-hidden`) but handles render at `text-[8px]` / `text-muted-foreground/50` — nearly illegible against dark hero. Fade overlay helps copy readability; marquee adds motion noise without conveying information. | Medium (a11y/clarity) | Desktop hero: faint avatar grid behind headline; handles not readable |
| **Hero copy vs waitlist** | Hero subcopy says “Waitlist: email + wallet, ~2 min” but waitlist quest **Step 1 requires wallet connect** before email (`StepWallet` → `StepEmail`). Mismatch creates expectation failure. | **High** (conversion friction) | Waitlist section shows “Forge Your Identity / Connect wallet to begin” |
| **Nav CTA clutter** | “Try Demo” appears **3×** above fold (nav link, nav button, hero button). “Log in” also duplicated (nav + hero inline links). No “Open App” when logged out (correct); authenticated state not exercised. | Medium | Desktop header: Try Demo link + button + hero CTA |
| **Fixed header** | Sticky nav intercepts clicks on hero “Join the Waitlist” when page at top (`Click target intercepted by non-interactive text element` at y=0–63). Users may think button is broken. | **High** | Browser click failure on hero waitlist CTA at scroll top |
| **`/#waitlist` deep link** | Navigating to `/#waitlist` updates URL but **does not scroll** to `#waitlist` section on load; user lands at hero. Header “Join Waitlist” button scroll works via `scrollIntoView`. | **High** | URL `/#waitlist` but viewport still on hero/demo |
| **Privacy modal** | Bottom-right “Privacy choices” banner on every fresh visit until dismissed. Copy is clear; two equal-weight buttons. Overlaps footer/CTA zone on short viewports; reappears after navigation if consent not stored (observed on `/` → `/pricing`). | Low–Medium | Pricing page screenshot: modal over empty content area |
| **React hydration** | Dev overlay reports hydration mismatch in `Logo.tsx` (Link wrapper). Can cause layout flicker and hurts trust in dev; verify SSR/client parity. | Medium (dev); verify prod | Red “1 Issue” Next.js overlay on landing after interactions |
| **Internal doc link** | Campaign Integrity section exposes raw repo path `docs/campaign-integrity-pilot.md` as link text — reads as broken/developer-facing, not a customer one-pager. | Medium | Link visible in a11y tree and page copy |
| **AI Judge demo** | Preset pills + paste flow work; “Score This” streams to result with dimension bars. Post-score CTAs: “Score another →”, “Share”, “Join Waitlist” — good conversion ladder. Empty state copy clear. | Pass | Farmer preset scored; score card + CTAs visible |
| **Account score gate** | “Score Your Whole Account” section hidden until tweet demo scored (`markJudgeDemoTried`) or waitlist joined. Toggle “Prefer accounts? Score an account” reveals `#twitter-analyzer`. Analyze disabled until handle entered. Gate logic matches `canShowAccountScore.ts`. | Pass (with note) | Section appears mid-page after demo; competes with waitlist quest visually |
| **Connect Wallet in nav** | Particle wallet “Connect Wallet” appears in marketing nav when provider configured — adds a fourth auth/wallet entry beside Log in / waitlist / demo. May confuse “wallet optional” narrative. | Low | Snapshot shows nav wallet button after demo interaction |

### Waitlist quest `/#waitlist`

| Step | Observation |
|------|-------------|
| **Step 1 — Wallet** | “Forge Your Identity”; only path forward is Connect Wallet (Particle). No visible “skip wallet” on marketing waitlist (optional-wallet work not surfaced here). |
| **Steps 2–4** | Not fully exercised (requires wallet modal / email / OAuth). Code: email → optional Twitter (skip allowed) → submit with success CTAs in `StepSubmit`. |
| **Success CTAs** | `StepSubmit` includes referral copy + links (not reached in live pass). |
| **Persistence** | Quest state persisted to localStorage (partial progress survives refresh). |

### Auth flows

| Route | Observation | Severity |
|-------|-------------|----------|
| **`/login`** | Three paths: email OTP, **4** social providers (GitHub, X, Discord, Telegram — not 5), wallet Connect + SIWE. Clear “No wallet required” microcopy for email. Whitelist hint: “Enter via signup”. Desktop layout: card left-aligned with large empty right half — feels unfinished. | Low (layout) |
| **`/login` mobile** | Single-column card readable; sticky footer adds second “Try Demo” + “Join Waitlist” bar — duplicates header hamburger destinations. | Medium |
| **`/signup`** | Waitlist email verification gate; “Verify Whitelist Status” disabled until email valid. **Dev-only** “Skip to Wallet Connect” and honeypot field labeled “Website” visible in a11y tree — should not ship to prod UI. Back link says “Back to pricing” (odd if user came from waitlist). | Medium (prod leak risk for dev UI) |
| **`/onboarding`** | Unauthenticated visit shows **indefinite spinner** only (no redirect to `/login`, no explanation). Authenticated social-only flow exists in code (`displayName` → branch → optional wallet) but unreachable without login. | **High** (dead end) |
| **Nav “Log in” / “Open App”** | `MarketingAuthActions`: Log in when anonymous; Open App when JWT present. Not tested logged-in (no session in audit). | — |

### Logical flow UX (dead ends & friction)

1. **Waitlist-first vs pay-first:** Pricing “Upgrade to Pro/Team” now calls Stripe checkout (`useUserCheckout`) — improvement vs prior waitlist-only doc — but unauthenticated click likely fails silently or errors (checkout not verified with backend in this pass). Free tier still sends to `/#waitlist`.
2. **Approved-user path:** Login → signup whitelist → wallet is multi-hop; copy on login helps but signup “Back to pricing” mis-orients.
3. **Demo → account score → login:** Gate unlock after demo works; login supports `?message=account-score` hint text — good — but account analyzer sits **below** waitlist on a long page; easy to miss.
4. **No Open App in nav** until authenticated — expected; ensure returning users see it (hydration bug may delay).
5. **Campaign Integrity / Pricing links** in hero secondary row add cognitive load next to primary demo/waitlist CTAs.

### Accessibility & contrast (spot check)

- Hero pre-headline “AIRDROPS ARE BROKEN” and “SCROLL” indicator: very low contrast (muted on dark).
- Marquee handles at 50% muted / 8px: fail WCAG for any informative text (currently decorative).
- FAQ accordions: proper button roles with `collapsed` state in a11y tree — good.
- Icon-only mobile menu has `aria-label="Open menu"` — good.
- Social login buttons are native `<button>` with text labels — good.

---

## Optimization

**Environment:** Next.js 16.2.1 Turbopack dev on `:3002`. Timings below are dev-local, not production CDN.

### Performance observations

| Metric / area | Finding | Impact |
|---------------|---------|--------|
| **LCP (qualitative)** | Hero H1 + CTAs render quickly (~370ms TTFB for `/` via curl). Marquee avatars load from **`unavatar.io`** (6 columns × duplicated handles ≈ 40+ external image requests on hero alone). Likely delays LCP/CLS as avatars pop in. | **High** — hero is heaviest visual |
| **`/api/waitlist/count`** | Server logs earlier in session showed **1.0–1.5s** response times; curl later ~350ms (warm). Social proof counter may block or stale-render if API slow. | Medium |
| **AI Judge demo** | Scoring invokes `/api/judge` stream — button shows “Scoring…” disabled state (good). No full LCP impact after first paint. | Low |
| **Animation** | Hero marquee CSS tracks (28–52s loops), Framer Motion on pricing cards, `scroll-behavior: smooth` on `<html>` (Next.js dev warning). Continuous marquee + CRT/glow on long pages = GPU cost on low-end mobile. | Medium |
| **Long landing page** | Single page stacks demo, pilot, social proof, problem, solution, features, comparison, FAQ, donate, waitlist, account analyzer — large DOM; repeated section headings in a11y tree. Scroll fatigue hurts conversion. | Medium |
| **Privacy modal** | Extra paint layer on first visit; defers analytics until click — correct for compliance, minor INP cost on first interaction. | Low |
| **Pricing page** | Framer `motion.div` stagger on plan cards; empty vertical space above fold in one screenshot suggests layout shift or slow content paint below nav. | Low–Medium |

### Conversion / product optimization

| Issue | Recommendation (doc only — not implemented) |
|-------|-----------------------------------------------|
| `/#waitlist` hash no scroll | Scroll to `#waitlist` on mount when hash present (or use `scroll-margin-top` on section + `scrollIntoView` in effect). |
| Wallet-required step 1 vs copy | Align hero/waitlist copy OR add “Continue with email only” path (S1 optional-wallet intent). |
| Pricing upgrade without auth | Gate checkout behind login or inline sign-in; show error toast if Stripe session fails. |
| Marquee image storm | Lazy-load off-screen columns, reduce column count on mobile, or static hero on `prefers-reduced-motion`. |
| Duplicate CTAs | Collapse nav to one primary (“Join Waitlist”) + one secondary (“Try Demo”); demote tertiary links below fold. |
| Dev UI on signup | Hide “Skip to Wallet Connect” and dev bypass outside `NODE_ENV=development`. |
| Onboarding spinner | Redirect unauthenticated users to `/login?next=/onboarding` with message. |
| Internal markdown link | Replace with `/campaign-integrity` or PDF one-pager URL. |

### Screenshots & flows exercised

| Flow | Result |
|------|--------|
| `/` landing hero + marquee | Visually OK; marquee low contrast; hydration warning in dev |
| AI Judge demo (Farmer preset → Score) | **Pass** — scores render, post-score CTAs shown |
| `/#waitlist` | **Partial fail** — hash scroll; step 1 wallet UI visible when scrolled |
| Privacy modal | Shown; dismissed once; reappeared on route change |
| `/login` | **Pass** — email + 4 social + wallet UI render |
| `/signup` | **Pass** — whitelist form; dev skip visible |
| `/onboarding` | **Fail** — spinner only without auth |
| Account score section | **Pass** — unlocked after demo; analyze gated on handle |
| `/pricing` | Renders plans; Upgrade buttons wired to checkout hook |
| Mobile 390px | Hamburger nav; sticky bottom bar; cramped hero links row |

*Sections UI/UX + Optimization completed 2026-05-25 (live audit, localhost:3002).*
