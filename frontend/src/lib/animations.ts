/**
 * Framer Motion presets: easings/durations, entrances, stagger, judge/score, loot, cards, buttons, XP, leaderboard, skill tree, modal, nav.
 * Compose `variants` on motion components; factory helpers (`scoreBarFill`, etc.) take dynamic values.
 */

import type { Variants, Transition } from "framer-motion"

// ── Easings ──────────────────────────────────────────────────────────────────

/** Cubic-bezier presets for motion timing. */
export const easings = {
  smooth: [0.4, 0, 0.2, 1] as const,
  snappy: [0.2, 0, 0, 1] as const,
  arcade: [0.34, 1.56, 0.64, 1] as const, // bounce overshoot
  gentle: [0.4, 0, 0.6, 1] as const,
} as const

/** Default durations (seconds) for transitions across the design system. */
export const durations = {
  instant: 0.1,
  fast: 0.15,
  normal: 0.25,
  slow: 0.4,
  dramatic: 0.7,
  score: 1.2,
} as const

// ── Page & Section Entrances ─────────────────────────────────────────────────

export const pageEnter: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: durations.slow, ease: easings.smooth },
  },
}

export const scrollReveal: Variants = {
  initial: { opacity: 0, y: 32 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: durations.slow, ease: easings.smooth },
  },
}

// ── Stagger Containers ────────────────────────────────────────────────────────

export const staggerContainer: Variants = {
  initial: {},
  animate: {
    transition: { staggerChildren: 0.05, delayChildren: 0.1 },
  },
}

export const staggerItem: Variants = {
  initial: { opacity: 0, scale: 0.9 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: { type: "spring", stiffness: 400, damping: 15 },
  },
}

export const staggerFadeUp: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: durations.normal, ease: easings.smooth },
  },
}

// ── Score & Judge ─────────────────────────────────────────────────────────────

export const scoreReveal: Variants = {
  initial: { opacity: 0, scale: 0.5 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 12,
      delay: 0.3,
    },
  },
}

export const scoreBarFill = (percentage: number): Variants => ({
  initial: { width: "0%" },
  animate: {
    width: `${percentage}%`,
    transition: { duration: 0.8, ease: easings.smooth, delay: 0.2 },
  },
})

export const farmingBadgeReveal: Variants = {
  initial: { opacity: 0, scale: 0, rotate: -10 },
  animate: {
    opacity: 1,
    scale: 1,
    rotate: 0,
    transition: { type: "spring", stiffness: 400, damping: 10, delay: 0.8 },
  },
}

// ── Loot System ───────────────────────────────────────────────────────────────

export const chestOpen: Variants = {
  initial: { rotateY: 0, scale: 1 },
  animate: {
    rotateY: [0, -15, 15, -10, 10, 0],
    scale: [1, 1.1, 1.05, 1.08, 1],
    transition: { duration: 0.6, ease: easings.arcade },
  },
}

export const lootReveal: Variants = {
  initial: { opacity: 0, y: 40, scale: 0.3 },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring", stiffness: 200, damping: 8, delay: 0.6 },
  },
}

export const rarityGlow = (rarityColor: string): object => ({
  animate: {
    boxShadow: [
      `0 0 8px ${rarityColor}40`,
      `0 0 24px ${rarityColor}80`,
      `0 0 8px ${rarityColor}40`,
    ],
    transition: { duration: 2, repeat: Infinity, ease: "easeInOut" },
  },
})

// ── Cards ─────────────────────────────────────────────────────────────────────

export const cardHover = {
  whileHover: {
    y: -4,
    transition: { duration: durations.fast, ease: easings.snappy },
  },
}

export const cardPress = {
  whileTap: { scale: 0.98 },
}

// ── Buttons ───────────────────────────────────────────────────────────────────

export const buttonPress = {
  whileTap: { scale: 0.95 },
  whileHover: { scale: 1.03, transition: { duration: durations.instant } },
}

// ── XP Bar ────────────────────────────────────────────────────────────────────

export const xpBarFill = (percentage: number): Variants => ({
  initial: { width: "0%" },
  animate: {
    width: `${percentage}%`,
    transition: { duration: 0.8, ease: easings.smooth, delay: 0.2 },
  },
})

// ── Leaderboard ───────────────────────────────────────────────────────────────

export const rankShift = {
  layout: true,
  transition: { type: "spring", stiffness: 300, damping: 25 } as Transition,
}

// ── Error / Farming Detected ──────────────────────────────────────────────────

export const screenShake: Variants = {
  initial: { x: 0 },
  animate: {
    x: [0, -3, 3, -2, 2, -1, 1, 0],
    transition: { duration: 0.35 },
  },
}

// ── Skill Tree ────────────────────────────────────────────────────────────────

export const nodeUnlock: Variants = {
  initial: { scale: 0.5, opacity: 0 },
  animate: {
    scale: [0.5, 1.2, 1],
    opacity: 1,
    transition: { duration: 0.5, ease: easings.arcade },
  },
}

export const nodePulse = {
  animate: {
    scale: [1, 1.05, 1],
    transition: { duration: 1.5, repeat: Infinity, ease: "easeInOut" },
  },
}

// ── Modal / Dialog ────────────────────────────────────────────────────────────

export const modalOverlay: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: durations.fast } },
  exit: { opacity: 0, transition: { duration: durations.fast } },
}

export const modalContent: Variants = {
  initial: { opacity: 0, scale: 0.95, y: 10 },
  animate: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: "spring", stiffness: 400, damping: 20 },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: { duration: durations.fast },
  },
}

// ── Nav ───────────────────────────────────────────────────────────────────────

export const mobileNavSlide: Variants = {
  initial: { x: "100%" },
  animate: {
    x: 0,
    transition: { type: "spring", stiffness: 300, damping: 30 },
  },
  exit: {
    x: "100%",
    transition: { duration: durations.normal, ease: easings.snappy },
  },
}
