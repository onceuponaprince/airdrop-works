# ADR 001 — Sequenced product roadmap (2026-05-21)

**Status:** Accepted  
**Source:** Episode 1 synthesis + founder decision (same date)  
**Revisit trigger:** Completion of Phase 3 exit criteria, or first paid pilot that forces reprioritisation

---

## Context

AI(r)Drop ships an AI Judge (rubric dimensions + `farming_flag` + account rollups) inside a gamified airdrop surface. Living research Episode 1 compared two spin-offs — **reputation / anti-farmer (A)** and **marketing creative judge (B)** — against staying on the core platform.

The founder chose a **five-phase sequence**: strengthen the core product first, productise Sybil/anti-bot second, marketing judge third, then longer-horizon plays for **open-source rubric / data cooperative** and **portable reputation network** (ChatGPT divergent paths #5 and #3).

---

## Decision

Execute in this order. Do not start a later phase’s GTM until the prior phase’s **exit criteria** are met (or explicitly waived in writing).

| Phase | Name | Summary |
|-------|------|---------|
| **1** | airdrop-works improvements | Platform core, landing↔app parity, sellable judge demo, integrity narrative |
| **2** | Sybil / anti-bot (reputation) | Second layer after Passport: content quality + farming, B2B/API |
| **3** | Marketing judge | Same engine, new rubric pack + separate surface/brand |
| **4** | Open-source rubric / data coop | Standard-setting + hosted scoring; trust via public criteria |
| **5** | Portable reputation network | Two-sided: protocol console + portable contributor score |

Phases 4–5 are **roadmapped, not deferred**. They follow Phase 3 because they require rubric maturity, campaign data, and GTM proof from Phases 1–3.

---

## Phase 1 — airdrop-works improvements

**Goal:** One credible story: *fair distribution starts with judging contributions, not counting wallets.*

**Build:**

- Landing refresh per `docs/figma-variables.md` and `.cursor/rules/figma-design-system.mdc`
- Marketing ↔ `(app)/judge` parity (`ScoreCard`, farming UX, streaming)
- “Campaign Integrity Pilot” offer in copy (batch report, farming %, CSV export v0)
- Align `CLAUDE.md` with code (SIWE/Particle, judge/crawlers as centre of gravity)
- Stable deploy path (lockfile, required deps, Vercel root = `frontend/`)

**Park until paid demand:** quest/loot/contracts as *product* (demo chrome OK).

**Exit:**

- Live protocol-facing demo in &lt;10 minutes
- One-pager that leads with integrity, not RPG mechanics
- No critical CI/Vercel blockers on `main`

**Phase 1 progress (2026-05-21):**

- [x] `CampaignIntegritySection` on landing + nav anchor
- [x] `docs/campaign-integrity-pilot.md` one-pager
- [x] Hero copy: Passport vs farming positioning
- [x] `CLAUDE.md` auth aligned to SIWE + Particle
- [x] CSV export v0 (`exportAccountCsv.ts` + AccountScoreCard button)
- [x] Waitlist `signupIntent` → Supabase `source` (`?intent=campaign_integrity_pilot`)
- [x] `/judge` copy aligned to integrity narrative
- [ ] Full Figma landing pass
- [ ] CI green on `main` (verify after push)

---

## Phase 2 — Sybil / anti-bot (reputation)

**Goal:** Productise existing judge + rollups; **do not** compete with Passport on proof-of-humanity.

**Positioning:** *Passport filters humans. We filter farmers and score contribution quality.*

**Build:**

- API-first: account/wallet → dimension scores + `farming_flag` + `farmingPercentage`
- Policy presets for allowlists, grants, airdrop allocation
- Optional read-only integration with identity providers (Passport/Trusta stamps as input signal)
- B2B integrity dashboard skin (reduce arcade-as-primary on sales surfaces)
- Pilot deliverable: exportable allocation recommendations + appeals note

**Exit:**

- 1–2 paid pilots or signed LOIs
- Evidence a buyer changed allocation using our output (not “nice demo”)

**Episode 2 research (start with Phase 2):** Platform BD (quest-platform embed) vs direct protocol outbound.

---

## Phase 3 — Marketing judge

**Goal:** Second vertical on shared `AICoreScoringService` — not a monorepo fork.

**Build:**

- Rubric pack `performance_marketing_v1` (hook, clarity, audience fit, CTA, fatigue risk)
- Subdomain or separate brand (not primary `airdrop.works` homepage)
- PLG: paste-copy demo, analytics, optional Stripe credits
- No ad-platform OAuth until Phase 3 exit met without it

**Exit:**

- Day-30-style gate passed: meaningful completion + signups OR
- 2–3 LOIs from crypto-native agencies/growth teams OR
- Explicit waiver to continue

**Kill:** If exit fails, fold learnings into Phase 2 only; do not maintain dual homepage GTM.

---

## Phase 4 — Open-source rubric / data coop (ChatGPT path #5)

**Goal:** Trust and distribution via **standard-setting** — public rubric/schema; monetise hosted scoring, premium signals, and cooperative dataset contributions.

**Why after Phase 3:** Needs battle-tested rubrics from Phases 1–3, labelled outcomes from pilots, and a stable judge API. Open-sourcing too early commoditises the only moat.

**Build (indicative):**

- Publish rubric spec (JSON Schema + versioning + changelog)
- OSS reference scorer or evaluation harness (optional local run)
- Hosted API tier: rate limits, SLA, private model options
- Data coop rules: what contributors/protocols may share; aggregation for farming-pattern detection
- Governance doc: how rubric versions change (community / foundation)

**GTM:** Developer and foundation inbound; “transparent criteria” buyers; upsell from Phase 2 enterprise accounts.

**Exit:**

- External team ships against your schema OR fork with attribution
- Measurable inbound (API keys, GitHub stars/discussions, foundation cite)
- At least one deal accelerated because OSS rubric reduced procurement friction

**Kill / defer signal:** Attention without API usage; rubric forked but nobody runs hosted scoring.

---

## Phase 5 — Portable reputation network (two-sided GTM)

**Goal:** System of record for **contribution reputation** — portable score across campaigns/protocols, not one-off lists.

**Why last:** Hardest GTM (protocols + contributors), needs graph data from Phases 2–4, appeals/legal/process maturity, and identity composability with Passport-class tools.

**Build (indicative):**

- Persistent contributor profile keyed by wallet (+ optional linked identities)
- Cross-campaign history: scores, farming rates, branch XP → reputation tiers
- Appeals and dispute resolution workflow
- Protocol console: query reputation, set policy, export allocations
- Contributor-facing: “my reputation” portability (verifiable credentials or API attestation later)

**GTM:** Two-sided — seed with Phase 2 protocol logos; contributor pull only after protocols require score.

**Exit:**

- ≥2 independent protocols reuse same reputation primitives across campaigns
- Repeat usage (not one-off exports)
- Appeals loop operated at least once in production

**Kill / defer signal:** Stuck at single-protocol silo; users want CSV export only, not portable identity.

---

## Alternatives considered

| Alternative | Why not now |
|-------------|-------------|
| Marketing judge first (B before A) | Weak `airdrop.works` fit; low codebase reuse; crowded MarTech |
| Parallel 70/30 A+B from day one | Resource trap; research day-30 B gate |
| Skip Phase 1 polish | Weak demo undermines Phases 2–3 sales |
| Jump to Phase 5 early | Two-sided GTM before single-sided proof |

---

## Consequences

**Buys:** Clear focus; each phase compounds data and rubrics; Phases 4–5 have explicit place without distracting Phases 1–3.

**Costs:** Slower TAM expansion until Phase 3+; Phases 4–5 may slip if Phase 2 pilots lag.

**Blocks:** Starting Phase 4 OSS before Phase 2 pilot data exists (empty rubric theatre). Starting Phase 5 before Phase 2 embeds in workflows (no graph moat).

---

## Links

- Synthesis: `../episodes/01-spinoff-vs-core.md`
- Divergent paths: `../sources/2026-05-21-chatgpt.md`
- Pilot: `../pilot.html`
