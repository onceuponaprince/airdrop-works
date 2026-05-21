# AI(r)Drop — Figma Variables Spec

> **Audience:** Design (Figma) · **Sync target:** `frontend/src/app/globals.css`, `tailwind.config.ts`, `theme.ts`, `constants.ts`  
> **Mode:** Dark only · **Aesthetic:** Neon Arcade RPG (not SaaS dashboard)  
> **Initiative:** Landing refresh + marketing ↔ platform visual continuity

Use this doc to build a Figma **variable collection** (and optional text styles / effect styles). Names below are suggested Figma paths; keep them stable so MCP → code mapping stays predictable.

**Implementer rules:** [`.cursor/rules/figma-design-system.mdc`](../.cursor/rules/figma-design-system.mdc)

---

## 1. Collection structure

Create one collection: **`AI(r)Drop / Arcade`**

| Group | Figma variable type | Notes |
|-------|---------------------|--------|
| `color/` | Color | Semantic + domain palettes |
| `radius/` | Number | px |
| `space/` | Number | px spacing scale |
| `size/` | Number | Layout max widths, nav height |
| `opacity/` | Number | Overlays, disabled (optional) |

**Do not** add a light mode. Single mode = production UI.

---

## 2. Semantic colors (`color/semantic/`)

Bind fills and strokes to these first. Hex values match compiled CSS (`hsl()` in code).

| Variable | Hex | HSL (code) | Usage |
|----------|-----|------------|--------|
| `color/semantic/background` | `#0A0B10` | 230 20% 4% | Page canvas |
| `color/semantic/foreground` | `#E8ECF4` | 220 30% 93% | Primary text |
| `color/semantic/card` | `#13141D` | 233 18% 9% | Cards, panels |
| `color/semantic/card-foreground` | `#E8ECF4` | 220 30% 93% | Text on cards |
| `color/semantic/popover` | `#13141D` | 233 18% 9% | Dropdowns, tooltips |
| `color/semantic/primary` | `#10B981` | 160 80% 40% | CTAs, XP, success, rings |
| `color/semantic/primary-foreground` | `#0A0B10` | 230 20% 4% | Text on primary buttons |
| `color/semantic/secondary` | `#1E293B` | 217 33% 17% | Secondary surfaces, tracks |
| `color/semantic/secondary-foreground` | `#94A3B8` | 215 16% 65% | Muted secondary text |
| `color/semantic/muted` | `#1E293B` | 217 33% 17% | Subtle backgrounds |
| `color/semantic/muted-foreground` | `#6B7280` | 220 9% 46% | Captions, hints |
| `color/semantic/accent` | `#A855F7` | 271 91% 65% | Epic tier, purple glow |
| `color/semantic/accent-foreground` | `#E8ECF4` | 220 30% 93% | Text on accent |
| `color/semantic/destructive` | `#EF4444` | 0 84% 60% | Errors, farming flag |
| `color/semantic/destructive-foreground` | `#E8ECF4` | 220 30% 93% | Text on destructive |
| `color/semantic/border` | `#1F2937` | 215 28% 17% | Borders, dividers |
| `color/semantic/input` | `#1F2937` | 215 28% 17% | Input borders |
| `color/semantic/ring` | `#10B981` | 160 80% 40% | Focus ring |

### Extended brand (optional aliases)

| Variable | Hex | Usage |
|----------|-----|--------|
| `color/brand/neon-cyan` | `#06B6D4` | Scout branch, impact dimension |
| `color/brand/hot-pink` | `#EC4899` | Creator branch |
| `color/brand/legendary-gold` | `#F59E0B` | Legendary rarity, S-rank |
| `color/brand/rare-blue` | `#3B82F6` | Rare tier, builder branch |

---

## 3. Rarity palette (`color/rarity/`)

Used on loot, badges, chest reveals. Match `RARITY_TIERS` in code.

| Variable | Hex | Label |
|----------|-----|-------|
| `color/rarity/common` | `#9CA3AF` | Common |
| `color/rarity/uncommon` | `#10B981` | Uncommon (= primary) |
| `color/rarity/rare` | `#3B82F6` | Rare |
| `color/rarity/epic` | `#A855F7` | Epic (= accent) |
| `color/rarity/legendary` | `#F59E0B` | Legendary |

---

## 4. Skill branches (`color/branch/`)

Left borders on branch cards, skill tree nodes, quest attribution.

| Variable | Hex | Branch |
|----------|-----|--------|
| `color/branch/educator` | `#10B981` | Educator |
| `color/branch/builder` | `#3B82F6` | Builder |
| `color/branch/creator` | `#EC4899` | Creator |
| `color/branch/scout` | `#06B6D4` | Scout |
| `color/branch/diplomat` | `#F59E0B` | Diplomat |

---

## 5. Quest difficulty (`color/difficulty/`)

| Variable | Hex | Rank |
|----------|-----|------|
| `color/difficulty/D` | `#9CA3AF` | D — Beginner |
| `color/difficulty/C` | `#10B981` | C — Easy |
| `color/difficulty/B` | `#3B82F6` | B — Medium |
| `color/difficulty/A` | `#A855F7` | A — Hard |
| `color/difficulty/S` | `#F59E0B` | S — Expert |

---

## 6. Score dimensions (`color/score/`)

AI Judge breakdown bars (same on landing demo and app `ScoreCard`).

| Variable | Hex | Dimension |
|----------|-----|-----------|
| `color/score/teaching-value` | `#10B981` | Teaching Value |
| `color/score/originality` | `#A855F7` | Originality |
| `color/score/community-impact` | `#06B6D4` | Community Impact |

---

## 7. Farming flags (`color/farming/`)

| Variable | Hex | State |
|----------|-----|--------|
| `color/farming/genuine` | `#10B981` | Genuine |
| `color/farming/farming` | `#EF4444` | Farming |
| `color/farming/ambiguous` | `#F59E0B` | Ambiguous |

Use ~10% fill opacity of these on badge backgrounds in Figma (code uses `bg-primary/10`, etc.).

---

## 8. Gradients (effect styles or variables)

Define as **Figma effect styles** or gradient swatches named to match code:

| Style name | CSS variable | Description |
|------------|--------------|-------------|
| `gradient/hero` | `--gradient-hero` | Radial: green 12% → purple 8% → transparent; hero ambient |
| `gradient/score-card` | `--gradient-score-card` | Linear 135°: card → secondary |
| `gradient/legendary` | `--gradient-legendary` | Gold shimmer for legendary CTA / loot |
| `gradient/crt-scanline` | `--gradient-crt-scanline` | 2px repeating scanlines (overlay, ~3% black) |

---

## 9. Typography (text styles)

Install fonts in Figma: **Press Start 2P**, **Space Grotesk** (500, 700), **DM Sans** (400, 500, 600), **JetBrains Mono** (400, 500).

| Text style | Font | Size | Weight | Letter-spacing | Use |
|------------|------|------|--------|----------------|-----|
| `type/display` | Press Start 2P | 48px | 400 | 2% | Hero score numbers, logo accents only |
| `type/h1` | Space Grotesk | 36px | 700 | -2% | Page titles |
| `type/h2` | Space Grotesk | 28px | 700 | -1% | Section titles |
| `type/h3` | Space Grotesk | 22px | 500 | 0 | Card titles |
| `type/h4` | Space Grotesk | 18px | 500 | 0 | Subsections |
| `type/body-lg` | DM Sans | 18px | 400 | 0 | Lead paragraphs |
| `type/body` | DM Sans | 16px | 400 | 0 | Default body |
| `type/body-sm` | DM Sans | 14px | 400 | 0 | Secondary copy |
| `type/score` | JetBrains Mono | 24px | 500 | 5% | Dimension values (tabular) |
| `type/label` | JetBrains Mono | 12px | 500 | 10% | Uppercase labels |
| `type/overline` | JetBrains Mono | 11px | 500 | 15% | Section overlines (“Airdrops Are Broken”) |

**Rules**

- Never set long paragraphs in Press Start 2P.
- Scores and wallet addresses: JetBrains Mono + tabular figures.

---

## 10. Spacing (`space/`)

Base unit **4px**. Prefer these over ad-hoc values.

| Variable | px | Typical use |
|----------|-----|-------------|
| `space/1` | 4 | Tight gaps |
| `space/2` | 8 | Icon gaps |
| `space/3` | 12 | Inline stacks |
| `space/4` | 16 | Mobile page padding |
| `space/5` | 20 | Card inner tight |
| `space/6` | 24 | Card gutter (`cardGap`) |
| `space/8` | 32 | Section inner |
| `space/10` | 40 | — |
| `space/12` | 48 | — |
| `space/16` | 64 | Nav height |
| `space/24` | 96 | Between landing sections (`sectionGap`) |

| Variable | px | Layout |
|----------|-----|--------|
| `size/page-padding-mobile` | 16 | `px-4` |
| `size/page-padding-desktop` | 32 | `px-8` |
| `size/max-width` | 1200 | Content shell |
| `size/hero-max-width` | 960 | Hero copy column |
| `size/score-card-max` | 480 | Judge result card |
| `size/form-max` | 480 | Waitlist / forms |
| `size/nav-height` | 64 | Fixed nav offset |

---

## 11. Radius (`radius/`)

| Variable | px | Usage |
|----------|-----|--------|
| `radius/base` | 6 | Default (`--radius` 0.375rem) |
| `radius/sm` | 4 | calc(base - 2px) |
| `radius/lg` | 6 | Same as base in code |

Cards, buttons, inputs: **`radius/base`** unless pixel-border motif needs square corners.

---

## 12. Effect styles (shadows & glow)

Name effect styles for dev handoff:

| Effect style | Approx CSS | Usage |
|--------------|------------|--------|
| `effect/glow-primary` | `0 0 20px primary @ 30%` | Default button |
| `effect/glow-primary-hover` | `0 0 28px primary @ 50%` | Button hover |
| `effect/glow-accent` | `0 0 20px accent @ 30%` | Purple highlights |
| `effect/glow-destructive` | `0 0 15px destructive @ 25%` | Farming / error |
| `effect/glow-gold` | `0 0 20px gold @ 40%` | Legendary |
| `effect/card-hover` | `0 0 16px primary @ 15%` | `ArcadeCard` hover |
| `effect/screen-glow` | inset + outer green | Score card CRT frame |

---

## 13. Component frames (Figma ↔ React)

When creating or refreshing frames, align to existing components so MCP implementation reuses code:

### Marketing (`(marketing)/`)

| Frame / page | React component |
|--------------|-----------------|
| Hero | `HeroSection` |
| AI Judge Demo | `AiJudgeDemo` |
| Social proof | `SocialProofSection` |
| CTA + waitlist | `CTASection`, `WaitlistForm` |
| Twitter analyzer | `TwitterAnalyzer` |
| Problem / Solution / Features / Comparison | Matching `*Section.tsx` |
| FAQ | `FAQSection` |
| Donate | `DonateSection` |
| Nav / Footer | `Navigation`, `Footer` |

### Platform (`(app)/`)

| Frame | React component |
|-------|-----------------|
| Dashboard | `dashboard/page` + `AccountScoreCard` |
| Judge | `ScoreCard` |
| Quests | `QuestCard` |
| Skill tree | `SkillTree` |
| Loot | `LootChest` |
| Leaderboard | `LeaderboardRow` |
| Shell | `AppSidebar`, `AppTopbar` |

### Shared primitives (use as Figma components)

| Figma component | Code |
|-----------------|------|
| Button / Primary CTA | `ArcadeButton` variant `primary` |
| Button / Legendary | `ArcadeButton` variant `legendary` |
| Card / Default | `ArcadeCard` |
| Card / Interactive | `ArcadeCard` + `interactive` |
| Score card | `ScoreCard` (marketing demo + app) |
| Badge / Rarity | `RarityBadge` |
| Badge / Difficulty | `DifficultyBadge` |
| CRT overlay | `CrtOverlay` |

---

## 14. Landing ↔ dashboard parity checklist

Before marking a frame “dev-ready”:

- [ ] Score card on landing uses same colors as app Judge (`color/score/*`, `color/farming/*`)
- [ ] Primary CTA uses `color/semantic/primary` + glow effect, not generic blue
- [ ] Cards use `color/semantic/card` + `color/semantic/border`, not white gray panels
- [ ] Typography styles match table in §9 (no display font on body)
- [ ] Quest/loot visuals use `color/rarity/*` and `color/difficulty/*` tokens
- [ ] Branch accents use `color/branch/*` only (five colors, no extras)
- [ ] Spacing uses `space/*` scale; section gaps ≈ `space/24`
- [ ] Radius = `radius/base` (6px)

---

## 15. Export & dev handoff

1. Publish the variable collection to the team library.
2. Apply variables to components (not raw hex on instances).
3. Link frames in Dev Mode with component names from §13.
4. For AI implementation: share **node URL + node ID**; dev uses Figma MCP (`get_design_context`, `get_screenshot`) per `.cursor/rules/figma-design-system.mdc`.

### Code reference map

| Figma group | Code file |
|-------------|-----------|
| Semantic colors | `frontend/src/app/globals.css` |
| Tailwind classes | `frontend/tailwind.config.ts` |
| JS tokens + motion | `frontend/src/styles/theme.ts` |
| Rarity / branch / difficulty | `frontend/src/lib/constants.ts` |
| Motion presets | `frontend/src/lib/animations.ts` |

---

## Changelog

| Date | Change |
|------|--------|
| 2026-05-21 | Initial spec for landing refresh + platform continuity |
