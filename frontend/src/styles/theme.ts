/**
 * AI(r)Drop — Neon Arcade RPG Design System
 * Single source of truth for design tokens as JS/TS constants.
 * These mirror the CSS variables in globals.css and the Tailwind config.
 */

// ─── Easing Curves ────────────────────────────────────────────────────────────

export const easing = {
  smooth:  [0.4, 0, 0.2, 1] as const,
  snappy:  [0.2, 0, 0, 1]   as const,
  arcade:  [0.34, 1.56, 0.64, 1] as const, // bounce overshoot — for unlocks, loot reveals
  gentle:  [0.4, 0, 0.6, 1] as const,
  enter:   [0, 0, 0.2, 1]   as const,
  exit:    [0.4, 0, 1, 1]   as const,
}

// ─── Duration Tokens ─────────────────────────────────────────────────────────

export const duration = {
  instant:  0.10,
  fast:     0.15,
  normal:   0.25,
  slow:     0.40,
  dramatic: 0.70,
  score:    1.20, // score counter count-up animation
  reveal:   0.80,
} as const

// ─── Color Tokens (matches CSS variables) ────────────────────────────────────

export const colors = {
  // Backgrounds
  background:   "#0A0B10",
  panelDark:    "#13141D",
  // Text
  screenWhite:  "#E8ECF4",
  ghostGray:    "#6B7280",
  // Brand
  arcadeGreen:  "#10B981",
  neonPurple:   "#A855F7",
  // Feedback
  flameRed:     "#EF4444",
  legendaryGold:"#F59E0B",
  neonCyan:     "#06B6D4",
  hotPink:      "#EC4899",
  rareBlue:     "#3B82F6",
  // Structural
  wireGray:     "#1F2937",
  steelBlue:    "#1E293B",
  // Rarity palette
  rarity: {
    common:    "#9CA3AF",
    uncommon:  "#10B981",
    rare:      "#3B82F6",
    epic:      "#A855F7",
    legendary: "#F59E0B",
  },
  // Branch palette
  branch: {
    educator: "#10B981",
    builder:  "#3B82F6",
    creator:  "#EC4899",
    scout:    "#06B6D4",
    diplomat: "#F59E0B",
  },
} as const

// ─── Typography Scale ─────────────────────────────────────────────────────────

export const typography = {
  fonts: {
    display: "var(--font-display)",   // Press Start 2P — hero numbers, score displays ONLY
    heading: "var(--font-heading)",   // Space Grotesk — section/card titles
    body:    "var(--font-body)",      // DM Sans — prose
    mono:    "var(--font-mono)",      // JetBrains Mono — scores, addresses, labels
  },
  scale: {
    display:     { size: "3rem",    lineHeight: 1.1, weight: 400, tracking: "0.02em",  font: "display" },
    h1:          { size: "2.25rem", lineHeight: 1.2, weight: 700, tracking: "-0.02em", font: "heading" },
    h2:          { size: "1.75rem", lineHeight: 1.3, weight: 700, tracking: "-0.01em", font: "heading" },
    h3:          { size: "1.375rem",lineHeight: 1.4, weight: 500, tracking: "0",       font: "heading" },
    h4:          { size: "1.125rem",lineHeight: 1.4, weight: 500, tracking: "0",       font: "heading" },
    bodyLg:      { size: "1.125rem",lineHeight: 1.6, weight: 400, tracking: "0",       font: "body" },
    body:        { size: "1rem",    lineHeight: 1.6, weight: 400, tracking: "0",       font: "body" },
    bodySm:      { size: "0.875rem",lineHeight: 1.5, weight: 400, tracking: "0",       font: "body" },
    score:       { size: "1.5rem",  lineHeight: 1,   weight: 500, tracking: "0.05em",  font: "mono" },
    label:       { size: "0.75rem", lineHeight: 1.4, weight: 500, tracking: "0.10em",  font: "mono" },
    overline:    { size: "0.6875rem",lineHeight: 1.3,weight: 500, tracking: "0.15em",  font: "mono" },
  },
} as const

// ─── Layout Tokens ───────────────────────────────────────────────────────────

export const layout = {
  maxWidth:          "1200px",
  pagePaddingMobile: "1rem",
  pagePaddingDesktop:"2rem",
  sectionGap:        "6rem",   // 96px — between landing sections
  cardGap:           "1.5rem", // 24px — gutter between cards
  cardPadding:       "1.25rem",
  navHeight:         "64px",
  borderRadius:      "0.375rem",
  maxScoreCard:      "480px",
  maxFormWidth:      "480px",
} as const

// ─── Shadow & Glow Tokens ────────────────────────────────────────────────────

export const shadows = {
  glowGreen:       "0 0 20px hsl(160 80% 40% / 0.30)",
  glowGreenHover:  "0 0 28px hsl(160 80% 40% / 0.50)",
  glowPurple:      "0 0 20px hsl(271 91% 65% / 0.30)",
  glowRed:         "0 0 15px hsl(0 84% 60% / 0.25)",
  glowGold:        "0 0 20px hsl(38 92% 50% / 0.40)",
  screenGlow:      "inset 0 0 60px hsl(160 80% 40% / 0.05), 0 0 40px hsl(160 80% 40% / 0.08)",
  cardHover:       "0 0 16px hsl(160 80% 40% / 0.15)",
  pixelBorder:     "2px 2px 0 0 hsl(215 28% 17%), -2px -2px 0 0 hsl(215 28% 17%)",
} as const

// ─── Framer Motion Presets ────────────────────────────────────────────────────

/** Standard page/section entrance — slides up and fades in */
export const fadeInUp = {
  initial:   { opacity: 0, y: 20 },
  animate:   { opacity: 1, y: 0 },
  transition: { duration: duration.slow, ease: easing.smooth },
}

/** Used for scroll-triggered sections via whileInView */
export const scrollReveal = {
  initial:     { opacity: 0, y: 32 },
  animate:     { opacity: 1, y: 0 },
  whileInView: { opacity: 1, y: 0 },
  viewport:    { once: true, margin: "-80px" },
  transition:  { duration: duration.slow, ease: easing.smooth },
}

/** Container that staggers its children */
export const staggerContainer = {
  initial:  {},
  animate:  { transition: { staggerChildren: 0.05, delayChildren: 0.1 } },
  whileInView: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
  viewport: { once: true },
}

/** Used as children inside staggerContainer */
export const staggerItem = {
  initial:  { opacity: 0, scale: 0.92, y: 12 },
  animate:  { opacity: 1, scale: 1, y: 0, transition: { type: "spring" as const, stiffness: 400, damping: 18 } },
  whileInView: { opacity: 1, scale: 1, y: 0, transition: { type: "spring" as const, stiffness: 400, damping: 18 } },
}

/** AI Judge score card reveal — springs in from scale 0.5 */
export const scoreReveal = {
  initial:  { opacity: 0, scale: 0.5 },
  animate:  { opacity: 1, scale: 1 },
  transition: { type: "spring" as const, stiffness: 300, damping: 12, delay: 0.3 },
}

/** Score bar fill — animate width from 0 to target% */
export const scoreBarFill = (pct: number) => ({
  initial:  { width: "0%" },
  animate:  { width: `${pct}%` },
  transition: { duration: duration.reveal, ease: easing.smooth, delay: 0.2 },
})

/** Farming detection badge stamps in with a spring */
export const farmingBadge = {
  initial:  { opacity: 0, scale: 0, rotate: -12 },
  animate:  { opacity: 1, scale: 1, rotate: 0 },
  transition: { type: "spring" as const, stiffness: 400, damping: 10, delay: 0.9 },
}

/** Loot chest shake before opening */
export const chestOpen = {
  initial:  { rotateY: 0, scale: 1 },
  animate:  {
    rotateY: [0, -15, 15, -10, 10, 0],
    scale:   [1, 1.1, 1.05, 1.08, 1],
    transition: { duration: 0.6, ease: easing.arcade },
  },
}

/** Loot item springs out after chest opens */
export const lootReveal = {
  initial:  { opacity: 0, y: 40, scale: 0.3 },
  animate:  { opacity: 1, y: 0, scale: 1 },
  transition: { type: "spring" as const, stiffness: 200, damping: 8, delay: 0.6 },
}

/** Card lifts on hover */
export const cardHover = {
  whileHover: { y: -4, transition: { duration: duration.fast, ease: easing.snappy } },
}

/** Button scale feedback */
export const buttonPress = {
  whileHover: { scale: 1.03, transition: { duration: duration.instant } },
  whileTap:   { scale: 0.95 },
}

/** Screen shake — farming detected or error */
export const screenShake = {
  initial:  { x: 0 },
  animate:  { x: [0, -3, 3, -2, 2, -1, 1, 0] },
  transition: { duration: 0.35 },
}

/** Skill tree node unlock burst */
export const nodeUnlock = {
  initial:  { scale: 0.5, opacity: 0 },
  animate:  { scale: [0.5, 1.2, 1], opacity: 1 },
  transition: { duration: 0.5, ease: easing.arcade },
}

/** Skill tree active node pulse */
export const nodePulse = {
  animate:   { scale: [1, 1.06, 1] },
  transition: { duration: 1.5, repeat: Infinity, ease: "easeInOut" },
}

/** XP bar fill */
export const xpBarFill = (pct: number) => ({
  initial:  { width: "0%" },
  animate:  { width: `${pct}%` },
  transition: { duration: 0.8, ease: easing.smooth, delay: 0.2 },
})

/** Leaderboard rank shift (use with layout prop) */
export const rankShift = {
  layout:     true,
  transition: { type: "spring" as const, stiffness: 300, damping: 25 },
}

/** Mobile nav slides in from right */
export const mobileNavSlide = {
  initial:  { x: "100%" },
  animate:  { x: 0 },
  exit:     { x: "100%" },
  transition: { type: "spring" as const, stiffness: 300, damping: 30 },
}

/** Modal overlay fade */
export const modalOverlay = {
  initial:  { opacity: 0 },
  animate:  { opacity: 1 },
  exit:     { opacity: 0 },
  transition: { duration: duration.fast },
}

/** Modal content spring */
export const modalContent = {
  initial:  { opacity: 0, scale: 0.95, y: 10 },
  animate:  { opacity: 1, scale: 1, y: 0 },
  exit:     { opacity: 0, scale: 0.95 },
  transition: { type: "spring" as const, stiffness: 400, damping: 20 },
}

/** Hero section entrance — used on the landing hero headline */
export const heroEntrance = {
  initial:  { opacity: 0, y: 30 },
  animate:  { opacity: 1, y: 0 },
  transition: { duration: duration.dramatic, ease: easing.smooth, delay: 0.2 },
}

/** Counter-up number animation starter (pairs with useAnimatedCounter hook) */
export const counterReveal = {
  initial:  { opacity: 0, scale: 0.7 },
  animate:  { opacity: 1, scale: 1 },
  transition: { type: "spring" as const, stiffness: 350, damping: 14, delay: 0.1 },
}
