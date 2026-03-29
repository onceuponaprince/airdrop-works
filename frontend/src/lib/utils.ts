import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Truncate a wallet address: 0x1234...5678 */
export function truncateAddress(address: string, chars = 4): string {
  if (!address) return ""
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`
}

/** Format a score number (0–100) to always be 2 digits */
export function formatScore(score: number): string {
  return score.toString().padStart(2, "0")
}

/** Clamp a value between min and max */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/** Calculate composite score from three dimension scores */
export function calcCompositeScore(
  teachingValue: number,
  originality: number,
  communityImpact: number
): number {
  return Math.round((teachingValue + originality + communityImpact) / 3)
}

/** Map a score 0–100 to a color class */
export function scoreToColorClass(score: number): string {
  if (score >= 80) return "text-primary"
  if (score >= 60) return "text-[#F59E0B]"
  if (score >= 40) return "text-muted-foreground"
  return "text-destructive"
}

/** Format a large number with K/M suffix */
export function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return n.toString()
}

/** Sleep for n milliseconds */
export const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms))
