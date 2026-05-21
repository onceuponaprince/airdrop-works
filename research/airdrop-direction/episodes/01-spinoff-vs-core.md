# Episode 1 — Spin-off A vs B vs core platform

**Status: Episode 1 complete — synthesis + pilot shipped.**

## The question

You have a working AI Judge (rubric scoring, farming flags, account rollups, crawlers, arcade demo). The market offers two forks: sell **trust** to Web3 distributions, or sell **ROI** to performance marketers. Episode 1 asks:

**Where should airdrop-works place its primary bet for the next 12 months — reputation anti-farmer (A), marketing spend judge (B), or a dual-wedge platform — and what does the codebase already make cheap?**

## Sub-questions for the sources

1. **Market pull** — Who pays today for Sybil/quality vs creative scoring? Budget cycles, deal size, bear-market resilience.
2. **Competitive moat** — How crowded is each lane (Passport, Cred, Trusta vs Advize, Segwise, etc.)? Where is whitespace?
3. **Technical reuse** — What fraction of the current monorepo survives each pivot? Time-to-MVP and what to delete.
4. **GTM motion** — Enterprise protocol sales vs PLG marketer signup; which matches a solo/small team?
5. **Brand fit** — Does `airdrop.works` help or hurt each pitch?
6. **90-day shape** — Concrete wedge, kill criteria, and success metrics for a platform + two wedges strategy.

## Source manifest

| Source | Routing role |
|--------|----------------|
| Gemini | Academic / industry: mechanism design, Sybil, contributor reputation, ad scoring literature |
| Perplexity | 2024–2026 production practice, cited post-mortems, pricing signals |
| Claude (cold) | First-principles strategy synthesis before reading other dumps |
| Grok | Contrarian: "both are wrong", third paths, recent X/CT takes |
| Copilot | Framework patterns for judge-as-a-service, rubric APIs |
| Cursor | Codebase trenches: what is already built in airdrop-works |
| ChatGPT | Divergent alternatives (≥5 per question): hybrids, pivots, acquihire paths |
| Web | Competitor landscape fetches (Sybil + creative intelligence) |

## Synthesis

### Verdict

**The claim holds.** Contributor reputation (content quality + farming detection, layered after identity) should be airdrop-works’ primary bet for the next twelve months. The marketing-judge fork is a valid **thirty-day PLG experiment** on a subdomain with a swapped rubric — not a pivot, not a second homepage, and not a reason to rebuild the monorepo. What survives if the claim is right is a **judge platform with two rubric packs**; what fails is treating “Arcade RPG airdrop game” and “MarTech creative OS” as one product story. The interesting tension the sources do not fully resolve is **distribution**: ChatGPT and Grok’s stubs both point to white-label/API and quest-platform embedding as faster paths than solo protocol outbound — that is Episode 2’s job.

---

### 1. Market pull and willingness to pay

**Convergence:** Lane A (reputation / anti-farming) has **spikier but higher-stakes** budgets tied to TGE, grants, and quest seasons; Lane B (marketing judge) has **broader habitual SaaS spend** but weaker crypto-native pull in 2026. Claude (cold) frames A as £5k–£25k pilots scaling to £50k–£150k if embedded; Perplexity and web-sybil note wallet Sybil APIs racing to **cents per lookup** — commodity at the identity layer. Web-marketing and ChatGPT align: creative intelligence is **validated demand** (Advize, Segwise, GetCrux) but **crowded**, with enterprise incumbents owning performance data flywheels.

**Divergence:** ChatGPT argues the best shape is a **sequenced dual-wedge platform** with anti-farmer first and “judge second” in a broader sense — including **white-label for Galxe/quest platforms** as potentially higher leverage than fifty protocol outreaches. Claude (cold) is more sceptical of B’s bear-market Web3 buyer but more optimistic about B’s **continuous** budget lines in Web2 — irrelevant unless PLG proves access. Gemini’s mechanism-design pass sharpens the point Passport solves **duplicate humans**, not **duplicate effort** — Zama-style monthly quality scoring is the industry’s movement toward your lane.

**Call for this sub-question:** Pull exists in both lanes; **WTP for A is deal-shaped and narrative-defensible** (“farmers won our drop”); **WTP for B requires proving you are not a ChatGPT wrapper**. Default kill: B unless PLG gates pass. **Suspect:** Vendor ROI percentages in web-marketing (20–40% waste reduction) are marketing claims, not independent studies — use as directional only.

---

### 2. Competitive moat

**Convergence:** Identity incumbents (Human Passport, Humanity Protocol, Cred, Trusta, WalletTag) own **eligibility gating**. Creative incumbents (Advize, Segwise, Blend, GetCrux) own **pre-launch scoring + platform integrations**. Neither owns **interpretable, rubric-driven contribution text scoring with farming flags and account rollups** as a **second layer after Passport** — Cursor’s trenches confirm this is already implemented (`JudgeScoreAccountView`, `farmingPercentage`, NDJSON streams). Gemini: moat must be **data + workflow + appeals**, not the LLM call.

**Divergence:** Grok stub (placeholder, not live) warns **LLM judges commoditise in six months** and moat is **on-chain enforcement** — points at your `contracts/` archive, not current frontend wiring. ChatGPT’s **open-source rubric + hosted eval** path trades revenue speed for **standard-setting** moat — viable if you want category ownership, hostile if you need cash in ninety days. Claude (cold): dual-wedge **splits moat** into two shallow products unless one wedge wins first.

**Call:** Moat-superiority for **A** if you embed in allocation workflows and accrete cross-campaign labels (appeals, pilot exports, Merkle CSV). **B** cannot moat on opinion alone — needs conversion-linked data or a **crypto-native creative niche** (meme authenticity, community quest copy). Do not compete with Passport on humanity; compete on **merit after humanity**.

---

### 3. Technical reuse

**Convergence:** Cursor is the authoritative read: **~65–70% backend reuse for A**, **~20–25% for B**; SPORE (~4,248 LOC) and four-platform crawlers are **A-only assets** ChatGPT underestimated without repo access. Claude (cold)’s generic 75–85% for A and 40–55% for B directionally match. Shared core: `AICoreScoringService`, `JudgeCache`, `ScoringRubric`, streaming judge UX (`useAiJudge`, `ScoreCard`).

**Divergence:** Cursor surfaces **reality drift** — `CLAUDE.md` says Dynamic.xyz; code uses **SIWE + Particle**; husky prepare is inert; Vercel needed lockfile/wagmi fix. These are operational, not strategic, but affect “ship in thirty days” claims. ChatGPT’s **white-label packaging** is mostly **tenant API + webhooks** — partially pre-built in SPORE Stripe plans ($99–$499 tiers).

**Delete lists (Cursor + Claude):** For A-primary — hide loot/skill-tree/referrals, park contracts, keep judge + crawlers + account card. For B — freeze contributions, spore, wallet auth; swap rubric dimensions; new marketer onboarding. **B MVP:** two–three weeks paste-copy on subdomain; **A MVP:** Campaign Integrity Pilot using existing account batch scorer.

**Call:** Code economics **force A as primary** unless founder has zero protocol network and extraordinary marketing distribution — founder-specific edge is explicitly **uncertain** in Claude (cold) and should be resolved by you, not this thread.

---

### 4. GTM motion

**Convergence:** A = founder-led outbound, demo-first (`AiJudgeDemo`), four-to-twelve week cycles, lighthouse logos. B = PLG, thirty-day gate, measure activation not ARR initially. ChatGPT: **platform BD to Galxe/Layer3** may beat fifty cold emails — **not yet tested** in your repo. Claude (cold): dual enterprise motions are a **resource trap**; cap B at **35% engineering hours** only through day thirty.

**Divergence:** Grok stub (synthetic): “embed as API inside quest platforms” vs “both forks are cope.” Worth a real Grok pass when CLI available. ChatGPT’s **portable reputation network** needs **two-sided GTM** — hardest for solo founder.

**Call:** Primary motion = **2–3 paid pilots in ninety days** (A). Parallel = **subdomain PLG only** (B). Optional Episode 2 = **one platform partnership sandbox** (white-label). Kill B on day thirty if score completion &lt;15% or signups &lt;10. Kill A on day ninety if zero paid pilots after ≥40 targeted outreaches — would **falsify** the claim.

---

### 5. Brand fit (`airdrop.works`)

**Convergence:** Unanimous: domain is **strong for A**, **weak for B** unless quarantined (`judge.airdrop.works` or new domain). Arcade aesthetic **polarises** enterprise buyers — Cursor recommends keep tokens, drop quest narrative on B2B pages. ChatGPT: portable reputation graph **outgrows** “airdrop” naming eventually — umbrella “quality scoring infrastructure” is SEO-poor but honest.

**Call:** Homepage stays **A story** during refresh. B experiment **must not** inherit main nav CTAs. Figma handoff (`docs/figma-variables.md`) should fork **B2B integrity dashboard** skin vs arcade demo — same tokens, different chrome.

---

### 6. Ninety-day execution shape

**Platform core (continuous):** Rubric versioning, judge API, audit log, cache — **no new game features** unless a pilot pays for them.

| Track | Effort | Weeks 1–4 | Weeks 5–12 | Kill |
|-------|--------|-----------|------------|------|
| **A — Reputation** | ~70% | Package “Campaign Integrity Pilot”; outbound 30 protocols; 3 discovery calls | Close 1–2 paid pilots; export CSV + farming report; case study | Day 90: zero paid + &lt;5 qualified calls after 40 outreaches |
| **B — Marketing wedge** | ~30% → 0% if fail | Subdomain + marketing rubric; GA4 funnel; no ad OAuth | Only if pass: Stripe credits | Day 30: completion &lt;15% or signups &lt;10 |
| **Optional BD** | 5% if network exists | One quest-platform sandbox conversation | — | No sandbox in 60 days → defer |

**Success metrics (A):** ≥£15k contracted or invoiced in ninety days (Claude cold); ≥1 paid pilot + evidence teams **changed allocation** using your flags (ChatGPT). **B:** 500 visitors / 25% completion / 5% share actions (Claude cold) — directional, not revenue-required.

**Hybrids to park for Episode 2:** White-label API (ChatGPT #2), open-source rubric spec (ChatGPT #5), agency “judge before distribution” narrow wedge (ChatGPT #4) — each reuses code but changes GTM; do not pursue in parallel during Episode 1.

---

### Closing

The sources converge on a **layered mental model**: Passport answers *who*; you answer ***what they contributed and whether it was farming***. The MarTech cluster answers *which creative might perform* with data you do not yet have. The contrarian line — Grok stub, synthetic — is fair: **without distribution, the judge is a feature**. That does not push you to B; it pushes you to **embed A** in someone else’s quest flow or sell pilots that **export decisions**, not scores alone.

**Open work for Episode 2:** (1) Platform BD vs direct protocol sales — which closes faster with your network? (2) SPORE graph as upsell vs distraction. (3) Live Grok/Perplexity/Copilot passes to replace stubs. (4) Founder-specific edge: do you have five protocol growth leads in DM, or five agency growth leads?

---

### What this commits us to (and does not)

**No ADRs from synthesis.** Nothing in `decisions/` until implementation chooses rubric namespace split, subdomain deploy, or quest-subsystem deletion.

**Pilot interactives (`pilot.html`):**

1. **Effort mixer** — sliders for Core / A / B; copy explains recommended 70/30 then 0% B if kill.
2. **Decision matrix** — six criteria weighted; default weights favour A; user can falsify with their context.
3. **90-day timeline** — toggle A-primary vs B-primary milestone tracks from synthesis table.

**Episode 2 candidate:** *Distribution architecture* — white-label quest platform vs protocol direct sales, with one partnership teardown and pricing benchmarks from live Perplexity pass.

**Repo actions implied (not ADRs):** Update `CLAUDE.md` auth section (SIWE/Particle); add `prompts/marketing_v1` rubric pack behind flag; landing refresh per Figma spec with **integrity** narrative leading arcade demo.

## Interactives shipped

Shipped in `../pilot.html`:

1. **Effort mixer** — allocate % across Core / Reputation A / Marketing B.
2. **Decision matrix** — six weighted criteria; A vs B.
3. **90-day wedge timeline** — A-primary vs B-primary tracks.

## Decisions triggered

None from synthesis alone. ADRs land when implementation commits (e.g. rubric pack split, separate marketing subdomain).
