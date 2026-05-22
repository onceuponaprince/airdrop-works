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

  marketingDemoScore: (source: "preset" | "custom") =>
    trackEvent("marketing_demo_score", { source }),

  marketingDemoComplete: (compositeScore: number, fatigueRisk: string) =>
    trackEvent("marketing_demo_complete", { composite_score: compositeScore, fatigue_risk: fatigueRisk }),

  marketingDemoFail: (reason: string) =>
    trackEvent("marketing_demo_fail", { reason }),

  aiJudgeResult: (farmingFlag: string, compositeScore: number) =>
    trackEvent("ai_judge_result", { farming_flag: farmingFlag, composite_score: compositeScore }),

  walletConnect: (chain: string) =>
    trackEvent("wallet_connect", { chain }),

  walletConnectError: (reason: string) =>
    trackEvent("wallet_connect_error", { reason }),

  walletAuthSuccess: (walletAddress: string) =>
    trackEvent("wallet_auth_success", { wallet_address: walletAddress }),

  walletAuthFail: (reason: string) =>
    trackEvent("wallet_auth_fail", { reason }),

  walletDisconnect: () =>
    trackEvent("wallet_disconnect"),

  lootClaimStarted: (chestId: string, lootType: string) =>
    trackEvent("loot_claim_started", { chest_id: chestId, loot_type: lootType }),

  questViewed: (questId: string, difficulty: string) =>
    trackEvent("quest_viewed", { quest_id: questId, difficulty }),

  questAccepted: (questId: string) =>
    trackEvent("quest_accepted", { quest_id: questId }),

  lootChestOpened: (rarity: string) =>
    trackEvent("loot_chest_opened", { rarity }),

  leaderboardViewed: (tab: string) =>
    trackEvent("leaderboard_viewed", { tab }),

  waitlistStepStarted: (step: string) =>
    trackEvent("waitlist_step_started", { step }),

  waitlistStepCompleted: (step: string) =>
    trackEvent("waitlist_step_completed", { step }),

  waitlistSubmitSuccess: (walletConnected: boolean, rank?: number) =>
    trackEvent("waitlist_submit_success", {
      wallet_connected: walletConnected,
      rank,
    }),

  twitterAnalyzeComplete: (handle: string, tweetCount?: number) =>
    trackEvent("twitter_analyze_complete", { handle, tweet_count: tweetCount }),

  donateStarted: (chain: string, amount: string) =>
    trackEvent("donate_started", { chain, amount }),

  donateSuccess: (chain: string, amount: string, txHash: string) =>
    trackEvent("donate_success", { chain, amount, tx_hash: txHash.slice(0, 16) }),

  pricingPlanClick: (plan: string) =>
    trackEvent("pricing_plan_click", { plan }),
}
