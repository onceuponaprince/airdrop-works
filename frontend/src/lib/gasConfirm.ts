/** USD threshold above which onchain loot claims require explicit confirmation. */

const DEFAULT_THRESHOLD_USD = 5

export function getGasConfirmThresholdUsd(): number {
  const raw = process.env.NEXT_PUBLIC_GAS_CONFIRM_THRESHOLD_USD
  const parsed = raw ? Number(raw) : DEFAULT_THRESHOLD_USD
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_THRESHOLD_USD
}

/** Placeholder estimate until wallet gas estimation is wired. */
export function estimateClaimGasUsd(lootType: LootType): number {
  if (lootType === "token") return 6
  if (lootType === "nft") return 5.5
  return 0
}

export type LootType = "xp" | "token" | "nft"

export function requiresGasConfirmation(lootType: LootType): boolean {
  return estimateClaimGasUsd(lootType) >= getGasConfirmThresholdUsd()
}
