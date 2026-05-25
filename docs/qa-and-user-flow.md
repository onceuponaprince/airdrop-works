# AI(r)Drop — User Flow + QA Guide

**Canonical reference for the live `airdrop.works` waitlist surface.**
Combines the end-to-end user flow definition and the manual QA / release-validation runbook into a single document so operators, QA, PM, and engineers all work from the same source.

- **Scope (v1):** the public waitlist landing page and its 4-step quest chain (wallet → email → twitter → submit). This is the only surface live on `airdrop.works` today.
- **Out of scope (v1):** logged-in app surfaces (dashboard, judge, quests, leaderboard, loot, admin, integrity console). For those, see [`docs/AIRDROP_WORKS_QA_ONBOARDING.md`](./AIRDROP_WORKS_QA_ONBOARDING.md) (human-facing) and [`docs/QA_GUIDE.md`](./QA_GUIDE.md) (technical seed-data setup).
- **Last validated against code:** git `ffbb271ea` on `main` (2026-05-25).

---

## 1 — Environment Setup

### 1.1 Required URLs

| Env | Frontend | API base | Supabase |
|---|---|---|---|
| Local | `http://localhost:3000` | same origin (`/api/*` route handlers) | configured via `frontend/.env.local` |
| Staging | (operator-provided preview URL) | same origin | staging Supabase project |
| Production | `https://airdrop.works` | same origin | production Supabase project |

> Backend Django (`localhost:8001`) is **not required** for the waitlist surface. The waitlist talks to Next.js route handlers + Supabase only.

### 1.2 Required env vars (frontend)

| Var | Purpose | Required? |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | Yes (waitlist insert/check) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key | Yes |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side waitlist count + protected reads | Recommended |
| `RESEND_API_KEY` | Confirmation email send | Optional (no-op if missing) |
| `EMAIL_FROM_ADDRESS` / `EMAIL_FROM_NAME` | Sender identity | Optional, defaults to `hello@airdrop.works` / `AI(r)Drop` |
| `NEXT_PUBLIC_GA_ID` | Analytics event capture | Optional (events no-op if missing) |
| `NEXT_PUBLIC_PROJECT_ID` / `NEXT_PUBLIC_CLIENT_KEY` / `NEXT_PUBLIC_APP_ID` | Particle wallet provider | Required for real wallet step; falls back to "Wallet Unavailable" if missing |
| `NEXT_PUBLIC_SITE_URL` | Used in referral URL when running server-side | Recommended |
| `NEXT_PUBLIC_ADMIN_BYPASS` | Hidden keypress bypass on step 1 | **Must be unset / strong in production** |

### 1.3 Test identities

The waitlist itself does not use seeded accounts (anyone can sign up). For QA negative paths, use these throwaway shapes:

| Persona | Email | Wallet | Notes |
|---|---|---|---|
| Fresh signup | `qa+<timestamp>@<your-domain>` | new MetaMask / WC address | Happy path |
| Returning email | reuse a prior QA email | any wallet (or none) | Triggers `alreadyExists: true` |
| Wallet conflict | new email | wallet already linked to another QA email | Triggers HTTP 409 |
| Disposable email | `qa@mailinator.com` | new wallet | Row inserted with `flagged: true` (silent — UX is identical to happy path) |
| Bot trap | submit with non-empty hidden `honeypot` field | n/a | Server returns fake success, **no DB write** |
| Rate-limit probe | repeated submits from same IP | n/a | 429 after threshold |

Backend / app-side identities (`qa-superadmin`, `genuine-user`, `farmer-user`, `qa-non-admin`) live in [`docs/qa-fixtures/test-identities.md`](./qa-fixtures/test-identities.md) — they're **not** used for the waitlist surface.

### 1.4 Browser / devtools prerequisites

- Chromium-based browser with devtools open during testing.
- Network tab set to "Preserve log".
- Application tab → Session Storage visible (the flow uses **session storage**, not local storage).
- Mobile viewport at 390×844 for the responsive pass.

### 1.5 Evidence folder convention

```bash
export QA_EVIDENCE=/tmp/airdrop-works-qa-$(date +%Y%m%d-%H%M%S)
mkdir -p "$QA_EVIDENCE"
```

Capture screenshots, HAR exports, and console logs into `$QA_EVIDENCE/`. Reference them in the bug report template (see §5).

---

## 2 — Canonical User Flow

Each row lists: **user action**, **UI state before**, **request / backend dependency**, **expected UI outcome**, **analytics event**, **operator QA note**.

### 2.1 Entry flow

| # | Action | UI before | Request | Expected UI | Analytics | QA note |
|---|---|---|---|---|---|---|
| E1 | Direct visit `/` | none | `GET /` | Landing renders; waitlist section reachable via `#waitlist`. | none on entry | Confirm Hero, AI Judge demo, WaitlistForm all render. |
| E2 | Referral visit `/?ref=<code>` | none | `GET /?ref=<code>` | Same landing renders. The `?ref` is **not** echoed to UI; it lives in `window.location.search` and is read at submit time. | none | Confirm URL preserves `?ref` after navigation; do **not** strip it. |
| E3 | Intent visit `/?intent=campaign_integrity_pilot#waitlist` | none | `GET` | Landing renders, page jumps to waitlist anchor. `signupIntent` captured at first render. | none | Only the allow-listed intent value is honored (`campaign_integrity_pilot`); unknown values are dropped silently. |
| E4 | Returning visit with persisted quest state | unfinished `airdrop_quest_state` in sessionStorage | `GET /` | Form resumes at the saved `currentStep` with `completedSteps` checked. | `waitlist_step_started` (for the resumed step) | Operator: clear sessionStorage to reset. |
| E5 | Returning visit after successful submit | sessionStorage cleared on success | `GET /` | Form starts fresh at step 1. No "already registered" banner unless user resubmits the same email. | none | Successful submit calls `clearPersistedState()`. |

### 2.2 Submission flow (the 4-step quest chain)

#### Step 1 — Connect wallet (`StepWallet`)

| # | Action | UI before | Request | Expected UI | Analytics | QA note |
|---|---|---|---|---|---|---|
| S1.a | Particle env present, click "Connect Wallet" | step 1 visible, button enabled | opens Particle modal | Modal opens with MetaMask / WC / Coinbase options. On select + sign, address shown truncated (`0x123…cdef`) with pulsing green dot. | `wallet_connect`, then `wallet_auth_success` | Truncation format is `addr.slice(0,6) + "…" + addr.slice(-4)`. |
| S1.b | Particle env missing | step 1 visible | none | Button reads "Wallet Unavailable" (disabled). Caption: "Particle wallet provider not configured". | `wallet_connect_error` | Block release if shown in production. |
| S1.c | User rejects in wallet | modal open | wallet returns error | `lastError.message` rendered under the button; button label changes to `lastError.action` (e.g. "Retry"). | `wallet_auth_fail` (with reason) | No stuck spinner; retry is one click. |
| S1.d | Click "Continue →" after connect | connected card visible | none | Advances to step 2; `walletAddress` persisted to sessionStorage. | `waitlist_step_completed` (`wallet`), then `waitlist_step_started` (`email`) | |

#### Step 2 — Verify email (`StepEmail`)

| # | Action | UI before | Request | Expected UI | Analytics | QA note |
|---|---|---|---|---|---|---|
| S2.a | Enter valid email + click "Send Code →" | input stage, button enabled when regex `^[^\s@]+@[^\s@]+\.[^\s@]+$` matches | `POST /api/waitlist/check` then `supabase.auth.signInWithOtp` | If email already in waitlist: skip OTP, advance to step 3 (returning-user fast path). Otherwise: switch to OTP stage; toast/inline says "Code sent to <email>". | `waitlist_step_completed` (`email`) only on advance | OTP is 6 digits, numeric, paste-supported. |
| S2.b | Enter invalid email | input stage | none | "Send Code →" button stays disabled. No request fired. | none | Validation is client-side regex; the API also re-validates. |
| S2.c | Enter wrong OTP code | OTP stage | `supabase.auth.verifyOtp` returns error | Inline error in destructive color. Inputs not cleared. | none | Should NOT lock the user out; can edit + re-verify. |
| S2.d | Click "Resend code" within 30s cooldown (wallet-first flow) | OTP stage | none | Button is disabled; caption "Resend available in Ns" counts down. | none | Cooldown stored in `airdrop_quest_email_resend_cooldown_until`. |
| S2.e | Click "Resend code" after cooldown | OTP stage | `supabase.auth.resend({ type: "signup" })` | OTP inputs reset; new code sent. | none | On 429 from Supabase, show "Too many resend attempts" inline. |
| S2.f | Click "← Wrong email?" | OTP stage | none | Returns to input stage, clears OTP + cooldown + `airdrop_quest_email_pending`. | none | |
| S2.g | Refresh page mid-OTP | OTP stage | none on reload | Page resumes in OTP stage for the pending email (read from `airdrop_quest_email_pending`). | `waitlist_step_started` (`email`) | Critical for the "user retries after partial failure" case. |
| S2.h | OTP verifies successfully | OTP stage | `supabase.auth.verifyOtp` 200 | Advances to step 3; `email` persisted to sessionStorage. | `waitlist_step_completed` (`email`), then `waitlist_step_started` (`twitter`) | |

#### Step 3 — Connect Twitter (`StepTwitter`, optional)

| # | Action | UI before | Request | Expected UI | Analytics | QA note |
|---|---|---|---|---|---|---|
| S3.a | Click "Connect Twitter" | step 3 visible | OAuth 2.0 PKCE redirect | User leaves the page for x.com auth, then returns. SessionStorage preserves prior state so the flow resumes. | `twitter_analyze_complete` (if score computed) | If env missing, this step should still be skippable. |
| S3.b | Click "Skip" | step 3 visible | none | Advances to step 4 with `twitterHandle = null`. | `waitlist_step_completed` (`twitter`), then `waitlist_step_started` (`submit`) | |
| S3.c | Click "← Change email" | step 3 visible | none | Returns to step 2, removes `email`/`twitter`/`submit` from `completedSteps`. | none | `goBackTo` is non-destructive — the user can re-enter and forward through again. |

#### Step 4 — Submit (`StepSubmit`)

| # | Action | UI before | Request | Expected UI | Analytics | QA note |
|---|---|---|---|---|---|---|
| S4.a | Click submit (happy path) | step 4 visible, summary of collected fields | `POST /api/waitlist` with `{ email, walletAddress, twitterHandle?, twitterScoreData?, referralCode?, signupIntent?, primaryBranch?, honeypot: "" }` | Success card: rank `#N`, referral code, copy-able referral URL. SessionStorage cleared. Confirmation email queued via Resend (if `RESEND_API_KEY` set). | `waitlist_signup`, `waitlist_submit_success` | Operator: verify `alreadyExists: false` for fresh signups. |
| S4.b | Submit with email already in waitlist | step 4 visible | `POST /api/waitlist` | Success card renders with **existing** rank + referral code, `alreadyExists: true` (no new email sent). | `waitlist_signup`, `waitlist_submit_success` | "Already registered" is a successful state, not an error. |
| S4.c | Submit with wallet already linked to another email | step 4 visible | `POST /api/waitlist` → 409 | Error: "This wallet is already linked to another waitlist signup." Inline; retry button available. | none on failure | User must go back to step 1 with a different wallet or use the original email. |
| S4.d | Submit while IP-rate-limited | step 4 visible | `POST /api/waitlist` → 429 | Error: "Too many signups from this IP." User stays on step 4. | none | Mostly hits bots, but throttle threshold should be loud enough to surface QA stress tests. |
| S4.e | Submit during network outage | step 4 visible | fetch throws | Error: generic "Something went wrong. Try again." Submit button re-enabled. No sessionStorage mutation. | none | Idempotency: a retry with the same data is safe (returns existing row). |
| S4.f | Spam-click submit | step 4 visible | first request fires; subsequent suppressed by `status: "submitting"` guard in `useWaitlist` | Only one POST in network tab. UI shows submitting state. | one event per submit | Confirm in devtools: zero duplicate writes in Supabase even with rapid clicks. |

### 2.3 Validation flow (consolidated)

| Validation | Where enforced | UI signal | HTTP outcome |
|---|---|---|---|
| Empty email | Client (button disabled), server (400) | Button disabled / "Valid email required" | `400` |
| Malformed email (`a@b`, `a.b`, `@x.com`) | Same regex client + server | Button disabled / `400` | `400` |
| Missing wallet | Step 4 only renders if `walletAddress` set | n/a — step 4 unreachable without wallet | (request never fires) |
| Invalid wallet address (e.g. typed) | n/a — wallet comes from Particle, not user typing | n/a | n/a |
| Empty body / non-JSON to API | Server | n/a (direct API hits only) | `400 "Invalid request body"` |
| Disposable email domain (mailinator, yopmail, …) | Server | UX identical to happy path | `200` (row inserted with `flagged: true`) |
| Bot honeypot field non-empty | Server | UX shows fake success | `200` with **random** rank, no DB write |

### 2.4 Referral handling

| Case | Capture | Persist | Submit |
|---|---|---|---|
| `?ref=CODE` present on initial visit | Read in `useWaitlist.submit` from `window.location.search` | URL preserved through navigation | Sent as `referralCode` in `POST /api/waitlist`; stored in Supabase as `referred_by` |
| `?ref=` missing | n/a | n/a | `referralCode: undefined`, `source` falls back to `Referer` header |
| `?ref=CODE` malformed (special chars, length) | Same path | Same path | Server trims; if non-empty, passes through (DB integrity is the backstop) — **does not crash app** |
| Referral preserved through Twitter OAuth redirect | sessionStorage carries quest state; `?ref` is **re-read** from URL at submit time | If x.com redirect strips the query, attribution is lost | QA note: confirm the post-OAuth return URL includes `?ref=` |

### 2.5 Returning-user flow

| Case | Behavior |
|---|---|
| User returns with completed quest state | sessionStorage was cleared on submit success; treated as fresh visit. |
| User returns with partial quest state | Resumes at the saved step; previously-completed steps shown as checked. |
| User submits same email twice | `alreadyExists: true`; no second email; rank unchanged. |
| User submits same email with NEW wallet | Existing row is updated (wallet added/changed) unless that wallet is already on another email → 409. |
| User submits same wallet with different email | 409 `WAITLIST_WALLET_CONFLICT`. |

### 2.6 Failure & recovery flow

| Failure | API status | UI | Recovery |
|---|---|---|---|
| Network offline during submit | fetch throws | "Something went wrong. Try again." | User can retry; idempotent. |
| Supabase unreachable | 500 | "Failed to join waitlist. Please try again." | Retry. |
| IP rate-limited | 429 | "Too many signups from this IP." | Wait + retry. |
| Wallet conflict | 409 | Specific copy (see S4.c) | User changes wallet OR uses original email. |
| Invalid email at server | 400 | "Valid email required" | Edit + retry. |
| Resend OTP rate-limited | Supabase 429 | "Too many resend attempts. Please wait a moment and try again." | Wait + retry. |
| OAuth callback failure (Twitter) | n/a | User lands back at step 3 with no handle; can skip. | Skip Twitter, submit without it. |

### 2.7 Final states

| State | Trigger | UI | Backend state |
|---|---|---|---|
| `success_new` | First-ever submit for `(email)` | Rank + referral card; `alreadyExists: false` | New row in `waitlist_entries`; email sent (if Resend configured) |
| `success_existing` | Submit with email already in DB | Same rank + referral card; `alreadyExists: true` | Existing row updated (wallet/branch/twitter), **no email** |
| `error_wallet_conflict` | Submit with conflicting wallet | Inline 409 message | No DB write |
| `error_rate_limit` | IP threshold exceeded | Inline 429 message | No DB write |
| `error_generic` | Anything else (500, network) | Inline generic retry message | No DB write |
| `silent_bot_success` | Honeypot field filled | Indistinguishable from `success_new` | **No DB write** (intentional deception) |
| `disposable_flagged` | Email domain in `DISPOSABLE_DOMAINS` set | Indistinguishable from `success_new` | Row inserted with `flagged: true` |

> There is no UI "ineligible / blocked" state on the waitlist surface today. Eligibility/exclusion concepts apply to the airdrop-allocation flow (admin-only, behind login) — out of scope for v1 of this doc.

---

## 3 — QA Execution Checklist

Run in order. Skip nothing. Mark each step **pass / fail / blocked** with evidence in `$QA_EVIDENCE/`.

### 3.1 Preflight

| # | Step | Expected | Failure means |
|---|---|---|---|
| P1 | Open landing URL, hard refresh. | Page paints under 3s; no blank flash; favicon + `AI(r)DROP` brand visible in tab. | Block release. |
| P2 | Open devtools console. | Zero fatal errors. Warnings about missing optional env (Resend, GA) are acceptable; **Supabase missing-env warning is a blocker**. | Block release if Supabase warning visible. |
| P3 | Network tab. | `/api/waitlist/count` returns 200 (or no call if count not displayed). No 4xx/5xx on initial load. | Block release on 5xx. |
| P4 | Inspect `<head>`: title, OG tags, theme color. | Brand-correct, no `localhost` leaks. | Polish issue (non-blocker) unless `localhost` URLs are shipped. |
| P5 | Source view: confirm no server secrets in HTML / JS bundle (no `SUPABASE_SERVICE_ROLE_KEY`, no `ANTHROPIC_API_KEY`, no `RESEND_API_KEY`). | Only `NEXT_PUBLIC_*` vars visible. | **Block release.** |

### 3.2 Core smoke pass (happy path)

| # | Step | Expected | Block? |
|---|---|---|---|
| C1 | Scroll to waitlist section / click hero CTA. | Form is visible; step 1 (wallet) is the active card. | Yes |
| C2 | Connect wallet (or use admin bypass keypress in non-prod). | Step 1 shows truncated address + pulse; "Continue →" enabled. | Yes |
| C3 | Click Continue → step 2 active. Enter fresh email, click "Send Code →". | OTP stage appears within 5s; "Code sent to <email>" visible. | Yes |
| C4 | Check inbox; paste OTP. | OTP auto-verifies on 6 digits OR Verify button works; advances to step 3. | Yes |
| C5 | Click "Skip" on Twitter (fast path). | Step 4 active with collected summary. | Yes |
| C6 | Click submit. | Success card with rank `#N` + referral code + copyable referral URL. | Yes |
| C7 | Hard refresh on success state. | Form renders at step 1 again (sessionStorage cleared); the success was email-only. | No (UX expectation, document if different) |

### 3.3 Negative-path pass

| # | Step | Expected | Block? |
|---|---|---|---|
| N1 | Enter `a@b` on step 2. | Send button disabled. | Yes |
| N2 | Hit `POST /api/waitlist` directly with invalid email via curl. | 400 + `{ error: "Valid email required" }`. | Yes |
| N3 | Submit empty body to `POST /api/waitlist`. | 400 + `{ error: "Invalid request body" }`. | Yes |
| N4 | Submit twice with same email. | Second response has `alreadyExists: true`, **no** second Resend email. | Yes |
| N5 | Submit with wallet already linked to a different email. | 409 + UI shows wallet-conflict message. | Yes |
| N6 | Submit `qa@mailinator.com`. | 200 success (UX identical), Supabase row has `flagged: true`. | No (operator note, not user-facing failure) |
| N7 | Submit with non-empty `honeypot` via curl. | 200 success with a random rank, **no row written** to Supabase. | Yes |
| N8 | Submit 6× from same IP within rate window. | 429 + "Too many signups from this IP." | Yes |
| N9 | Visit with malformed referral: `?ref=<script>alert(1)</script>`. | App does not execute the script; submit either stores the trimmed value or rejects via DB constraint — never crashes the form. | Yes |
| N10 | Disable network, click submit. | Generic retry error; submit button re-enables. | Yes |
| N11 | Refresh page mid-OTP (after "Send Code" but before "Verify"). | OTP stage resumes for the pending email. | Yes |

### 3.4 Referral-flow QA

| # | Step | Expected |
|---|---|---|
| R1 | Visit `/?ref=test123`. | URL retains `?ref=test123` through scrolling and step navigation. |
| R2 | Submit. Inspect Supabase row. | `referred_by = "test123"`. |
| R3 | Visit `/?ref=test123#waitlist`, then back-button, then forward. | `?ref` still in URL on resumed view. |
| R4 | Visit `/?ref=`. | Empty ref treated as no ref; `referred_by` is null. |
| R5 | Visit `/?ref=` with 200-char string. | App does not crash; server trims and forwards. (DB column length may reject — that's fine, must not crash UI.) |
| R6 | Visit `/?intent=campaign_integrity_pilot`. | On submit, Supabase `source` = `campaign_integrity_pilot`. |
| R7 | Visit `/?intent=not-on-allowlist`. | Intent dropped silently; `source` falls back to `Referer` header. |

### 3.5 Responsive & browser QA

| # | Step | Expected |
|---|---|---|
| B1 | Chrome desktop ≥ 1280px wide. | Full landing + waitlist render correctly. |
| B2 | Mobile viewport (390×844). | No horizontal overflow, buttons tappable, OTP inputs reachable, modals fit. |
| B3 | Tab through the form with keyboard only. | Focus reaches every input/button in source order; focus ring visible. |
| B4 | Safari desktop (if available). | Same as Chrome — no font fallback issues, OAuth redirect works. |
| B5 | OTP paste behavior. | Pasting a 6-digit code into any input fills all 6 boxes and auto-verifies. |
| B6 | Long wallet addresses on small screens. | Truncate cleanly with `…` ellipsis, do not overflow card. |

---

## 4 — Evidence Checklist

Capture before sign-off, into `$QA_EVIDENCE/`:

- [ ] `01-landing.png` — landing page on cold load (desktop)
- [ ] `02-landing-mobile.png` — same on mobile viewport
- [ ] `03-form-step-wallet.png` — step 1 active
- [ ] `04-form-step-email-otp.png` — step 2 OTP stage
- [ ] `05-form-success.png` — success card with rank + referral
- [ ] `06-error-wallet-conflict.png` — 409 state
- [ ] `07-error-rate-limit.png` — 429 state
- [ ] `08-console-clean.png` — devtools console on success
- [ ] `09-network-success.har` — full HAR for happy path
- [ ] `10-network-409.har` — HAR for wallet-conflict path
- [ ] `git-sha.txt` — `git rev-parse HEAD > "$QA_EVIDENCE/git-sha.txt"`
- [ ] `deployed-url.txt` — the URL actually under test
- [ ] `lint-output.log`, `typecheck-output.log`, `test-output.log`, `build-output.log` if the release gate run was performed

---

## 5 — Release Sign-off (Go / No-Go)

### Block release if ANY of these are true

- [ ] App does not boot cleanly (blank, fatal console errors, missing brand).
- [ ] Submission happy path fails for at least one tester on a clean browser.
- [ ] Duplicate-email protection is broken (second submit creates a second row instead of returning `alreadyExists: true`).
- [ ] Wallet-conflict protection is broken (different email can claim a wallet that's already linked).
- [ ] Invalid input (malformed email, bad JSON body) causes a crash or silently writes to Supabase.
- [ ] Referral attribution breaks the core submit (e.g. `?ref=<script>…` causes the form to throw).
- [ ] Success state is misleading or inconsistent (e.g. shows rank `#0`, wrong referral URL, blank card).
- [ ] Network tab shows unhandled 5xx on the happy path.
- [ ] Mobile flow is unusable (overlap, button unreachable, modal off-screen).
- [ ] Any server secret (`SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `ANTHROPIC_API_KEY`) is visible in client HTML or JS bundle.

### Non-blocking (file as polish backlog)

- Copy polish, microcopy inconsistencies.
- Spacing / layout nits that don't break the action.
- Browser-specific styling differences without behavior change.
- Missing optional env (Resend, GA) — no email or no analytics is acceptable for non-production envs.

### Bug-report template

```
Title:
Environment: local / staging / production
Step in user-flow doc (e.g. S2.c):
Browser + device:
Steps to reproduce:
Expected:
Actual:
Severity: blocker / high / medium / low
Evidence: <path under $QA_EVIDENCE>
Git SHA:
```

---

## 6 — Appendices

### 6.1 Analytics events (real names, from `frontend/src/lib/analytics.ts`)

| Event | Fired when | Params |
|---|---|---|
| `waitlist_step_started` | Each step becomes active (including resumed) | `{ step: "wallet" \| "email" \| "twitter" \| "submit" }` |
| `waitlist_step_completed` | Each step completes (incl. submit) | `{ step }` |
| `waitlist_signup` | Submit path returns success | `{ wallet_connected, branch? }` |
| `waitlist_submit_success` | Same path, post-server | `{ wallet_connected, rank }` |
| `wallet_connect` | Particle modal opens | `{ chain }` |
| `wallet_connect_error` | Particle reports error | `{ reason }` |
| `wallet_auth_success` | SIWE or wallet auth completes | `{ wallet_address }` |
| `wallet_auth_fail` | Wallet auth rejected/failed | `{ reason }` |
| `wallet_disconnect` | User disconnects | none |
| `twitter_analyze_complete` | Twitter step scoring returns | `{ handle, tweet_count? }` |

If `NEXT_PUBLIC_GA_ID` is unset, all events no-op silently. QA verification: just confirm the event would-fire, not the GA roundtrip.

### 6.2 SessionStorage keys

| Key | Purpose | Cleared by |
|---|---|---|
| `airdrop_quest_state` | Full quest state (step, completed, wallet, email, twitter) | `clearPersistedState()` on submit success |
| `airdrop_quest_email_pending` | Email awaiting OTP verify | OTP verify success OR "Wrong email?" button |
| `airdrop_quest_email_resend_cooldown_until` | Epoch ms when resend re-enables | Cooldown expiry tick |

### 6.3 Query params

| Param | Allowed values | Behavior |
|---|---|---|
| `?ref=<code>` | any string; passed through trim | Stored as `referred_by` in Supabase |
| `?intent=<value>` | currently only `campaign_integrity_pilot` | Stored as `source`; unknown values dropped silently |
| `#waitlist` | hash | Scroll-to-anchor only |

### 6.4 API contracts (waitlist surface)

| Endpoint | Method | Body | Success | Failures |
|---|---|---|---|---|
| `/api/waitlist` | POST | `{ email, walletAddress?, primaryBranch?, referralCode?, honeypot?, twitterHandle?, twitterScoreData?, signupIntent? }` | `200 { rank, referralCode, referralUrl, alreadyExists }` | `400` invalid body / email; `409` wallet conflict; `429` rate limit; `500` supabase error |
| `/api/waitlist/check` | POST | `{ email }` | `200 { exists: boolean }` | Always 200 (intentional — no enumeration oracle). |
| `/api/waitlist/count` | GET | none | `200 { count }` | Always 200 (returns `0` on error). |

### 6.5 Supabase data model (`waitlist_entries`)

Inferred from `frontend/src/lib/supabase.ts`. The Next.js server tolerates missing columns by stripping them — useful for staging environments behind the production schema.

| Column | Type | Notes |
|---|---|---|
| `email` | text (PK or unique) | Lowercased + trimmed before insert |
| `wallet_address` | text, unique | Lowercased if `0x`-prefixed |
| `primary_branch` | text | Optional |
| `referral_code` | text | This row's own referral code |
| `referred_by` | text | Referral code that pointed this user here |
| `source` | text | `signupIntent` if valid, else `Referer` header, else `"organic"` |
| `flagged` | bool | `true` for disposable email domains (tolerant if column missing) |
| `twitter_handle` | text | Tolerant if column missing |
| `twitter_score_data` | jsonb | Tolerant if column missing |
| `twitter_connected_at` | timestamptz | Tolerant if column missing |
| `approved` | bool | Used by `checkWhitelistApproval`; tolerant if missing |
| `rank` | int | Server-assigned |

### 6.6 Cross-references

- [`docs/QA_GUIDE.md`](./QA_GUIDE.md) — technical seed-data setup for the app surfaces (Django, JWT, fake wallets).
- [`docs/AIRDROP_WORKS_QA_ONBOARDING.md`](./AIRDROP_WORKS_QA_ONBOARDING.md) — human-facing onboarding for testers walking the logged-in product.
- [`docs/qa-fixtures/`](./qa-fixtures/) — JSON fixtures + identity table for the integrity/allocate admin path.
- [`docs/qa-findings/`](./qa-findings/) — per-session QA findings logs (e.g. `session-01.md`).

---

## 7 — App Auth Flow (login / signup / onboarding)

**Scope:** logged-in app surfaces reached via `/login`, `/signup`, `/onboarding`, and the landing ↔ app bridge. Complements the waitlist-only flow in §2.

**Providers:** wallet SIWE + five login methods on `/login` — email OTP, X, Discord, GitHub, Telegram.

### 7.1 Landing ↔ app bridge

| Touchpoint | Anonymous user | Authenticated user (JWT) |
|---|---|---|
| Nav `MarketingAuthActions` | **Log in** → `/login` | **Open App** → `/dashboard` |
| Mobile sticky CTA | **Log in** → `/login` | **Open App** → `/dashboard` |
| Hero inline link | **Log in** | **Open app** |
| Waitlist success (`StepSubmit`) | **Approved? Enter app** → `/signup`; **Log in** → `/login` | Same CTAs available |
| Footer | **Login** → `/login` | — |

### 7.2 `/login` flow

| # | Action | Expected UI / redirect |
|---|---|---|
| L1 | Visit `/login` unauthenticated | Email OTP panel + four social buttons + wallet connect + dev login (dev only) |
| L2 | Email OTP happy path | Code sent → verify → JWT in `localStorage` → `/dashboard` (S7: `/onboarding` if no wallet) |
| L3 | Social OAuth happy path | Provider redirect → return `?{provider}=login&access=…` → session applied → app redirect |
| L4 | Telegram login | Deep link opens → user taps Start → poll completes → session applied |
| L5 | Wallet SIWE | Connect → sign → `POST /auth/wallet-verify/` → `/dashboard` |
| L6 | Dev login (local) | `Dev Login (no wallet)` → `qa-superadmin` wallet → `/dashboard` |
| L7 | Footer cross-link | **Enter via signup** → `/signup` for approved waitlist users |

### 7.3 `/signup` flow (approved waitlist)

| # | Action | Expected |
|---|---|---|
| S1 | Enter approved waitlist email | Whitelist check passes → wallet connect step |
| S2 | Connect wallet + SIWE | JWT issued → `/dashboard` |
| S3 | Unapproved email | Stays on email step; no wallet step |

### 7.4 `/onboarding` (S7 — social-only users)

| # | Action | Expected |
|---|---|---|
| O1 | Social-only JWT (no wallet) after login | Redirect to `/onboarding` instead of `/dashboard` |
| O2 | Wallet user after login | Skip onboarding → `/dashboard` |
| O3 | Complete or skip onboarding | Persist choice → `/dashboard` (or SPORE Lab per workspace flow) |

### 7.5 Identity merge (S6 — Resend confirm)

When login email matches an existing account tied to a different auth method:

1. **No auto-merge** — backend sends Resend confirmation email.
2. User clicks confirm link → `GET /api/auth/merge/confirm?token=…` validates token (single-use, expiry).
3. On success: identities linked; wallet + social accounts retained on merged user.
4. On failure (expired/reused token): show error; user must restart login.

QA must verify merge is impossible without clicking the email link.

### 7.6 Auth guard

| Route group | Unauthenticated | Authenticated |
|---|---|---|
| `(app)/*` e.g. `/dashboard` | `AuthGuard` → `/login` | Renders protected content |
| `/login`, `/signup` | Renders auth UI | Redirect to `/dashboard` (or `/onboarding` per S7) |
