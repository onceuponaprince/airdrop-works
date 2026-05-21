# Claude (cold) — raw dump 2026-05-21
**Routing role:** Independent first-principles synthesis before other sources
**Tool:** Claude subagent (cold)
**Brief:** Episode 1. See ../episodes/01-spinoff-vs-core.md.

---

## Claim under test

Contributor reputation (content-quality + farming detection) should be the primary product bet for airdrop-works; marketing-judge is a fast experiment wedge, not full pivot unless PLG proves otherwise in 30 days.

---

## 1. Market pull & willingness to pay

### Lane A — reputation / anti-farming for Web3 distributions

**Who pays:** Token issuers, foundations, and growth leads at protocols running points programmes, retroactive airdrops, or quest-based campaigns. Secondary buyers include DAO treasury committees and launchpads that need defensible allocation narratives for token holders and regulators.

**Why they pay now:** The 2023–2025 airdrop cycle produced a well-documented failure mode: reward pools captured by coordinated farmers, leaving genuine contributors under-compensated and communities hostile. Post-distribution, projects face reputational damage ("farmers won"), secondary sell pressure, and governance capture by sybil wallets. Prevention is cheaper than retroactive remediation, but most teams only feel acute pain *during* or *after* a botched drop — timing is episodic, not continuous.

**Budget cycles:** Allocation tooling sits in growth/marketing budgets pre-TGE, often alongside KOL spend, quest platforms (Galxe, Layer3), and analytics (Dune, Nansen). Decisions cluster 8–16 weeks before snapshot or claim. Enterprise-style protocol deals are lumpy: one campaign, one invoice, long sales cycle. Retainer models exist but are uncommon unless the vendor becomes embedded in ongoing contributor programmes.

**Deal size (order-of-magnitude, uncertain):** Pilot scoring for a single campaign might land at £5k–£25k for a small protocol; multi-chain programmes with account rollups and appeals could reach £50k–£150k annually if renewed. Bear-market resilience is moderate: fewer new token launches, but existing projects still run retention quests and "season 2" points; anti-farming becomes *more* salient when token price is weak and community trust is fragile. Countervailing force: teams with depleted treasuries defer discretionary tooling and rely on free heuristics (wallet age, on-chain activity thresholds).

**WTP drivers:** Legal/compliance anxiety (securities, misleading promotion), investor pressure for "fair" distribution, and fear of Twitter backlash. WTP is weak when teams believe volume metrics alone satisfy their board — many still optimise for MAU and social impressions rather than contribution quality.

**Lane B — marketing judge (creative / spend ROI scoring)**

**Who pays:** Performance marketers, growth agencies, DTC brands, and Web2-native growth teams evaluating ad copy, landing pages, and campaign variants. Web3 marketing teams are a subset — smaller TAM, similar pain.

**Why they pay now:** Creative testing is perpetual, not episodic. Teams already pay for AdCreative.ai, Motion, Pencil, various LLM wrappers, and agency retainers. The pain is continuous: "which hook converts?" Budget lines exist in always-on SaaS categories.

**Budget cycles:** Monthly or annual SaaS subscriptions; credit-based API usage. Procurement is lighter for sub-£500/month tools; heavier above £2k/month in mid-market.

**Deal size (uncertain):** PLG entry at £29–£199/month is crowded. Meaningful revenue requires either high-volume API (agencies) or enterprise marketing ops at £1k–£10k/month. Bear-market resilience for Web3-specific buyers is poor; Web2 performance marketing is cyclical with ad spend, not crypto cycles.

**Comparative pull:** Lane B has broader addressable market and clearer habitual purchasing behaviour. Lane A has sharper pain for a narrower buyer, higher stakes per deal, but spikier demand tied to launch calendars. For a solo founder, Lane B's PLG motion offers faster feedback loops; Lane A's enterprise motion offers larger cheques but longer cycles and relationship dependency.

**Verdict on pull:** Neither lane shows uncontested "pull you into the room" without outbound effort. Lane A aligns with the domain name and existing demo narrative. Lane B aligns with how software is bought at small price points. The claim under test — A primary, B as 30-day PLG experiment — assumes Lane A's deal size and strategic fit outweigh Lane B's easier top-of-funnel unless B demonstrates exceptional conversion quickly. That is plausible but unproven; the 30-day PLG gate is appropriate.

---

## 2. Competitive moat

### Lane A — Sybil resistance and contributor reputation

**Incumbent categories:**

1. **Identity / proof-of-personhood:** Worldcoin, Gitcoin Passport, Coinbase Verifications, Holonym. These sell *eligibility gating*, not *contribution quality*. Overlap at the funnel entrance, not at the scoring layer.

2. **Wallet scoring / trust graphs:** Trusta Labs, Nomis, Cred Protocol (where active), various "trust score" APIs. Often black-box, on-chain weighted, weak on off-chain content semantics.

3. **Quest platforms with basic anti-bot:** Galxe, Layer3, Zealy. Built-in sybil heuristics; unlikely to offer deep content-quality rubrics as core product — could partner or acquire.

4. **Manual review + community moderation:** Default competitor. Free, slow, political.

5. **Generic LLM workflows:** Teams paste tweets into ChatGPT. Zero moat, high variance.

**Whitespace (hypothesis):** Interpretable, rubric-driven *contribution* scoring that combines off-chain text/media quality with farming-pattern detection and account-level rollups — auditable enough for a DAO to defend allocation decisions. Most identity products do not judge *what you said*; most content tools do not tie scores to token allocation workflows.

**Moat sources for A:**

- **Proprietary labelled data:** Scored contributions + human appeal outcomes across campaigns. Compounds with volume.
- **Rubric + model calibration per vertical:** DeFi vs gaming vs L2 infra use different quality signals.
- **Integration depth:** Crawlers, snapshot pipelines, export to Merkle distributors. Switching cost after one successful campaign.
- **Reputation graph over time:** Cross-campaign contributor history — "this wallet consistently produces educator-tier content" — hard to replicate without running campaigns.

**Moat weaknesses:** LLM scoring is commoditising rapidly. Any moat must sit in data, workflow, and trust — not the model call. Passport-style products could add "content score" features. Quest platforms could verticalise. Uncertainty: whether protocols want a neutral third party or prefer in-house AI with legal control.

### Lane B — marketing creative judge

**Incumbent categories:**

1. **Ad creative analytics:** Motion, VidMob, Marpipe — performance-linked, platform integrations, large datasets.
2. **Generative ad tools:** AdCreative.ai, Pencil, Canva Magic — creation + light scoring.
3. **Copy testing SaaS:** Wynter, UsabilityHub — human panel + structured tests.
4. **LLM ad copy generators:** Abundant, low differentiation.

**Whitespace (narrow):** Web3-native meme/culture scoring with community authenticity signals — a niche within a niche. Generic "score this ad" is not whitespace.

**Moat sources for B:**

- Proprietary conversion data linked to scores (requires integrations and scale).
- Vertical templates (e.g. crypto Twitter voice) — easily copied.

**Moat weaknesses:** Lane B is structurally more crowded. PLG winners have distribution moats (SEO, Meta/Google partnerships) that a new entrant lacks. Without performance data feedback loops, the product is a opinionated LLM — replaceable.

**Comparative moat:** Lane A offers a clearer path to defensibility through campaign-specific data and workflow lock-in. Lane B requires either massive PLG scale or a data flywheel that takes years. Dual-wedge does not combine moats — it splits focus and may produce two shallow products.

**Verdict:** Primary bet on A is moat-superior if execution embeds in allocation workflows and accumulates cross-campaign reputation data. B as wedge does not require moat on day one; it requires learning whether any wedge exists within 30 days.

---

## 3. Technical reuse (generic, no repo access)

Assume a typical stack for this product class: Next.js frontend with demo UX, Django/DRF backend, PostgreSQL, Redis/Celery async, Anthropic (or equivalent) for structured JSON scoring, Twitter/social crawlers, wallet auth (Dynamic/SIWE), rubric JSON schema, account rollup models, arcade-themed landing.

### Lane A — reputation anti-farmer (primary)

**High reuse (~75–85% of core engineering value):**

- AI Judge service: prompt template, JSON score parser, farming flag enum, caching by content hash.
- Contribution model and crawler ingestion pipeline.
- Account/profile rollups, XP branches, leaderboard logic — maps directly to reputation tiers.
- Wallet-first auth and protocol-facing API patterns.
- Demo landing with live scoring — sales asset for protocol pilots.

**Moderate adaptation:**

- Rubric packs per campaign/client; admin UI for weight tuning.
- Export formats for snapshots, CSV for Merkle inputs, appeals queue.
- Rate limits and audit logs for enterprise buyers.

**Low reuse / new build:**

- On-chain gating integrations (Passport API, etc.) — adapter layer, not greenfield.
- Legal/compliance documentation, SLAs, SOC2 — GTM not code.
- White-label tenant model if selling to launchpads.

**Delete or deprioritise for A-only:** Stripe subscription flows tuned for marketers, ad platform OAuth, creative asset storage, A/B test statistical engines.

**Time-to-MVP (solo, uncertain):** 4–8 weeks to package existing judge + rollups as "Campaign Integrity API" with one pilot client; 3–4 months for repeatable enterprise onboarding.

### Lane B — marketing judge (wedge)

**Moderate reuse (~40–55%):**

- Core judge pipeline (text in → structured scores out).
- Streaming demo UX pattern.
- Generic rubric engine — swap dimensions from teaching_value/originality to hook_strength/clarity/CTA/conversion_hypothesis.

**Low reuse:**

- Arcade RPG aesthetic and skill-tree metaphors — may confuse Web2 marketers unless sub-branded.
- Wallet auth — irrelevant; email/OAuth primary.
- Contributor crawlers — wrong data source; need ad copy input, URL fetchers, optional Meta/Google asset import.
- Quest/loot/leaderboard game layer — delete for B focus.

**New build for B:**

- Marketer onboarding, team seats, credit billing.
- Template library for ad formats (Meta primary text, Google RSA, TikTok hook).
- PLG funnel: free tier, shareable score cards, export to Notion/Slack.
- Integration with ad platforms if claiming ROI — large scope.

**Time-to-MVP wedge (uncertain):** 2–3 weeks for a standalone landing + paste-copy demo reusing judge backend with marketing rubric; 6–10 weeks for credible PLG with billing and retention instrumentation.

### Dual-wedge platform

**Reuse illusion:** Both lanes share a "judge core," but diverge on identity model, data ingestion, buyer UX, pricing, and brand. Maintaining one monolith with two rubric namespaces is feasible short-term; maintaining one *product* narrative is not.

**Cost of dual:** Every sprint splits between protocol sales features and PLG growth features. Estimated 30–40% overhead on shared infra vs single bet.

**Verdict on reuse:** Codebase economics favour A as primary without fork. B is cheap as rubric variant + separate landing subdomain, expensive as equal product. Technical reuse supports the claim under test: keep monorepo, add marketing rubric pack behind feature flag, do not re-architect for B unless PLG metrics pass gates.

---

## 4. GTM motion

### Lane A — enterprise protocol sales

**Motion:** Founder-led outbound to growth leads and token economists at 20–50 target protocols planning points or airdrops. Lead with demo (score three tweets live), offer pilot on historical campaign data, convert to paid snapshot review or ongoing scoring retainer.

**Sales cycle:** 4–12 weeks typical; longer for top-tier L1/L2 foundations. Requires credibility signals: case study, advisory name, or partnership with quest platform.

**Team fit:** Works for solo/small team if founder tolerates async sales and technical pre-sales. Does not require paid ads. Does require network in Web3 growth circles — uncertain for any given founder.

**Challenges:** Procurement friction, demand spikiness, custom rubric negotiations, appeals handling (human-in-loop cost).

### Lane B — PLG marketer signup

**Motion:** SEO/content on "score ad copy before you spend," Product Hunt, Twitter ads (ironically), templates viral loop, free tier → paid credits.

**Sales cycle:** Minutes to days for initial signup; weeks to determine retention and conversion to paid.

**Team fit:** PLG demands continuous content, onboarding optimisation, support volume, and analytics discipline — hard for solo founder simultaneously building protocol features. 30-day experiment is correct scope: one landing, one rubric, measure activation not revenue initially.

**Challenges:** CAC in crowded market, commoditisation, brand mismatch (see §5).

### Dual-wedge platform GTM

**Risk:** Two homepages, two ICPs, two support queues. "Platform" story only works after one wedge wins and the second becomes expansion revenue — e.g. protocols also buy marketing scoring for their own growth teams (weak overlap).

**Recommended motion aligned with claim:**

1. **Primary:** A — direct outreach + demo-led pilots; aim for 2–3 paid pilots in 90 days.
2. **Parallel experiment:** B — single subdomain, no sales calls, measure PLG funnel only.
3. **Kill B** if activation <15% of visitors scoring once, or paid conversion <2% of activated, or no organic sharing signal at day 30.
4. **Do not** run dual enterprise sales motions.

**Verdict:** GTM fit strongly favours A as primary for small Web3-native team. B as timed experiment is disciplined; B as co-primary is a resource trap.

---

## 5. Brand fit (airdrop.works)

**Semantic load of the domain:** "Airdrop" signals token distribution, farmer/Sybil context, crypto-native audience. Instant comprehension for Lane A buyers. Instant *misclassification* for Lane B buyers as crypto tooling rather than general marketing SaaS.

**Lane A fit: strong**

- Name reinforces problem domain (distribution integrity).
- Arcade RPG aesthetic differentiates from sterile compliance dashboards — may polarise enterprise buyers (some want gravitas, not quest UI). Uncertainty: whether protocol CFOs take "game UI" seriously; mitigated by separate "integrity dashboard" skin for B2B.
- Wallet-native auth is coherent.
- Risk: name ties company to a cyclical, reputational volatile niche if Web3 rebrand away from "airdrops" continues.

**Lane B fit: weak to moderate**

- Performance marketers searching for "ad scoring" do not type "airdrop.works."
- Requires sub-brand (e.g. judge.airdrop.works or entirely separate domain) to avoid bounce.
- Arcade aesthetic may delight indie marketers; may undermine enterprise marketing ops buyers.
- Using crypto-flavoured demo copy for Web2 ads creates cognitive dissonance.

**Dual-wedge brand: confusing**

- Homepage cannot serve two masters without segmentation failure.
- "We score contributions for fair airdrops AND your Facebook ads" lacks coherent identity.
- Platform narrative needs umbrella term ("quality scoring infrastructure") — generic, SEO-poor, investor-unfriendly.

**Verdict:** Brand is an asset for A, a liability for B unless quarantined on subdomain with neutral marketing copy. Primary bet on A maximises domain equity. B wedge should not inherit main brand CTAs on airdrop.works homepage beyond a small "Also: score ad copy" experiment link — if shown at all during test period.

---

## 6. 90-day execution shape + kill criteria

### Strategic shape (platform + two wedges)

**Platform core (weeks 1–12, continuous):** Judge-as-a-service API, rubric schema versioning, scoring cache, audit log, single admin for dimensions/weights. No new game features unless they serve A pilots.

**Wedge A — reputation (primary, 70% effort):**

| Weeks | Milestone |
|-------|-----------|
| 1–2 | Package "Campaign Integrity Pilot" offer: historical tweet batch scoring + farming report + top contributor list. Pricing draft on slide, not self-serve. |
| 3–4 | Outbound to 30 protocols; secure 3 discovery calls; 1 paid or LOI pilot. |
| 5–8 | Deliver pilot; capture before/after farmer concentration metric; document appeals process. |
| 9–12 | Second pilot or renewal; rubric pack v2 from learnings; export format for allocation team. |

**Wedge B — marketing judge (experiment, 30% effort weeks 1–4, then data-driven):**

| Weeks | Milestone |
|-------|-----------|
| 1–2 | Marketing rubric live on subdomain; paste-box demo; GA4 events: score_started, score_completed, share_clicked, signup. |
| 3–4 | Optional: 5 pre-made ad examples, Twitter thread launch, one community post. |
| Day 30 | **Decision gate** (see kill criteria). |
| 5–12 | If pass: add Stripe credits + email capture. If fail: freeze feature, redirect effort to A. |

### Success metrics

**A (primary):**

- 2+ paid pilots OR 1 paid + 2 strong LOIs with defined budget by day 90.
- Pilot NPS or qualitative: buyer would recommend for next campaign.
- Demonstrable delta: flagged farming accounts as % of scored population vs baseline heuristic — even directional evidence counts.
- Revenue target (uncertain): ≥£15k contracted or invoiced in 90 days for solo viability signal.

**B (experiment):**

- ≥500 unique visitors to wedge landing in 30 days (or proportional if purely organic).
- ≥25% score completion rate among those who start.
- ≥5% share or copy-link actions among completers (virality proxy).
- ≥10 email signups willing to receive product updates.
- Optional paid: any £ conversion by day 90 is bonus, not required for continue — PLG revenue lags.

### Kill criteria

**Kill B (default expectation unless proven):**

- Day 30: score completion <15% OR signups <10 OR zero organic referrals.
- Day 90: zero paid conversions AND week-over-week active scorers declining.
- Any signal that support burden exceeds one hour per week without revenue path.

**Kill A (contingency — would overturn primary bet):**

- Day 90: zero paid pilots AND <5 qualified discovery calls after ≥40 targeted outreaches.
- Repeated objection: "we will use Passport + Excel" with no willingness to pay for content layer.
- Pilot churn: pilots complete but refuse renewal citing "good enough" free LLM workflow.

**Kill dual-wedge (prevent drift):**

- If both A and B miss intermediate gates, do not add C; narrow to strongest signal or pause B entirely.
- No separate fundraising narrative for "two products" until one wedge hits success metrics.

### Resource guardrails for solo/small team

- Max one new integration before first A pilot closes (avoid integration swamp).
- Marketing wedge built only from rubric swap + new frontend shell — no ad platform OAuth in first 30 days.
- Weekly review: hours logged A vs B; if B >35% of engineering after day 30 without pass gate, reallocate.

---

## Synthesis verdict (cold, pre-other-sources)

The claim under test is **directionally correct** on first principles:

1. **Market pull** is narrower but higher-stakes for A; B has easier trials but weaker differentiation and brand mismatch.
2. **Moat** accumulates in A through campaign data and workflow; B without conversion data is a feature, not a company.
3. **Technical reuse** heavily skews to A; B is a cheap experiment if scope-limited.
4. **GTM** for a small Web3-aligned team favours demo-led protocol sales over marketer PLG as primary motion.
5. **Brand** (`airdrop.works`) is aligned with A, misaligned with B unless quarantined.
6. **90-day shape** should allocate ~70/30 then apply hard day-30 PLG gate on B.

**Key uncertainties requiring other sources:** actual 2024–2026 pricing paid to Trusta/Passport-adjacent tools; documented protocol WTP post-FTX/bear cycle; PLG conversion benchmarks for LLM scoring tools; codebase-specific build state (Cursor source); contrarian third paths (Grok).

**Not yet falsified:** That marketing wedge could outperform on speed to revenue — possible for founder with weak protocol network but strong distribution in marketing Twitter. Cold analysis weights structural fit over founder-specific edge, which only founder context can resolve.
