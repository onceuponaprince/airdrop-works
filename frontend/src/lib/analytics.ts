declare global {
  interface Window {
    gtag?: (command: string, ...args: unknown[]) => void
  }
}

type EventParams = Record<string, string | number | boolean | undefined>

export function trackEvent(eventName: string, params?: EventParams) {
  if (typeof window === "undefined") return
  if (!process.env.NEXT_PUBLIC_GA_ID) return

  window.gtag?.("event", eventName, {
    ...params,
    send_to: process.env.NEXT_PUBLIC_GA_ID,
  })
}

// ── Typed events for AI(r)Drop ────────────────────────────────────────────────

export const events = {
  waitlistSignup: (walletConnected: boolean, branch?: string) =>
    trackEvent("waitlist_signup", { wallet_connected: walletConnected, branch }),

  aiJudgeDemo: (demoType: "preset" | "custom") =>
    trackEvent("ai_judge_demo", { demo_type: demoType }),

  aiJudgeResult: (farmingFlag: string, compositeScore: number) =>
    trackEvent("ai_judge_result", { farming_flag: farmingFlag, composite_score: compositeScore }),

  walletConnect: (chain: string) =>
    trackEvent("wallet_connect", { chain }),

  walletDisconnect: () =>
    trackEvent("wallet_disconnect"),

  questViewed: (questId: string, difficulty: string) =>
    trackEvent("quest_viewed", { quest_id: questId, difficulty }),

  questAccepted: (questId: string) =>
    trackEvent("quest_accepted", { quest_id: questId }),

  lootChestOpened: (rarity: string) =>
    trackEvent("loot_chest_opened", { rarity }),

  leaderboardViewed: (tab: string) =>
    trackEvent("leaderboard_viewed", { tab }),
}
