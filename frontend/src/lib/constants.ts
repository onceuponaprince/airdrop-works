// ── Rarity Tiers ─────────────────────────────────────────────────────────────

export const RARITY_TIERS = {
  common: {
    label: "Common",
    color: "#9CA3AF",
    textClass: "text-[#9CA3AF]",
    bgClass: "bg-[#9CA3AF]",
    borderClass: "border-[#9CA3AF]",
  },
  uncommon: {
    label: "Uncommon",
    color: "#10B981",
    textClass: "text-primary",
    bgClass: "bg-primary",
    borderClass: "border-primary",
  },
  rare: {
    label: "Rare",
    color: "#3B82F6",
    textClass: "text-[#3B82F6]",
    bgClass: "bg-[#3B82F6]",
    borderClass: "border-[#3B82F6]",
  },
  epic: {
    label: "Epic",
    color: "#A855F7",
    textClass: "text-accent",
    bgClass: "bg-accent",
    borderClass: "border-accent",
  },
  legendary: {
    label: "Legendary",
    color: "#F59E0B",
    textClass: "text-[#F59E0B]",
    bgClass: "bg-[#F59E0B]",
    borderClass: "border-[#F59E0B]",
  },
} as const

export type RarityTier = keyof typeof RARITY_TIERS

// ── Skill Tree Branches ───────────────────────────────────────────────────────

export const BRANCHES = {
  educator: {
    label: "Educator",
    description: "Teaching & explaining",
    color: "#10B981",
    colorClass: "text-[#10B981]",
    borderClass: "border-l-[#10B981]",
    bgClass: "bg-[#10B981]",
    icon: "GraduationCap",
    examples: ["Threads", "tutorials", "explainers", "AMAs"],
  },
  builder: {
    label: "Builder",
    description: "Creating tools & code",
    color: "#3B82F6",
    colorClass: "text-[#3B82F6]",
    borderClass: "border-l-[#3B82F6]",
    bgClass: "bg-[#3B82F6]",
    icon: "Code2",
    examples: ["GitHub PRs", "dApps", "bots", "scripts"],
  },
  creator: {
    label: "Creator",
    description: "Original content",
    color: "#EC4899",
    colorClass: "text-[#EC4899]",
    borderClass: "border-l-[#EC4899]",
    bgClass: "bg-[#EC4899]",
    icon: "Palette",
    examples: ["Art", "memes", "videos", "infographics"],
  },
  scout: {
    label: "Scout",
    description: "Discovery & research",
    color: "#06B6D4",
    colorClass: "text-[#06B6D4]",
    borderClass: "border-l-[#06B6D4]",
    bgClass: "bg-[#06B6D4]",
    icon: "Search",
    examples: ["Alpha calls", "protocol analysis", "risk assessments"],
  },
  diplomat: {
    label: "Diplomat",
    description: "Community building",
    color: "#F59E0B",
    colorClass: "text-[#F59E0B]",
    borderClass: "border-l-[#F59E0B]",
    bgClass: "bg-[#F59E0B]",
    icon: "Users",
    examples: ["Moderation", "onboarding", "translation", "dispute resolution"],
  },
} as const

export type Branch = keyof typeof BRANCHES

// ── Quest Difficulty Ratings ──────────────────────────────────────────────────

export const DIFFICULTY_RATINGS = {
  D: {
    label: "D",
    description: "Beginner",
    color: "#9CA3AF",
    textClass: "text-[#9CA3AF]",
    bgClass: "bg-[#9CA3AF]",
  },
  C: {
    label: "C",
    description: "Easy",
    color: "#10B981",
    textClass: "text-primary",
    bgClass: "bg-primary",
  },
  B: {
    label: "B",
    description: "Medium",
    color: "#3B82F6",
    textClass: "text-[#3B82F6]",
    bgClass: "bg-[#3B82F6]",
  },
  A: {
    label: "A",
    description: "Hard",
    color: "#A855F7",
    textClass: "text-accent",
    bgClass: "bg-accent",
  },
  S: {
    label: "S",
    description: "Expert",
    color: "#F59E0B",
    textClass: "text-[#F59E0B]",
    bgClass: "bg-[#F59E0B]",
  },
} as const

export type DifficultyRating = keyof typeof DIFFICULTY_RATINGS

// ── Farming Flag Labels ───────────────────────────────────────────────────────

export const FARMING_FLAGS = {
  genuine: {
    label: "Genuine",
    description: "This contribution adds real value.",
    color: "#10B981",
    bgClass: "bg-primary/10",
    textClass: "text-primary",
    borderClass: "border-primary/30",
  },
  farming: {
    label: "Farming",
    description: "This looks like engagement farming.",
    color: "#EF4444",
    bgClass: "bg-destructive/10",
    textClass: "text-destructive",
    borderClass: "border-destructive/30",
  },
  ambiguous: {
    label: "Ambiguous",
    description: "This could go either way. Context matters.",
    color: "#F59E0B",
    bgClass: "bg-[#F59E0B]/10",
    textClass: "text-[#F59E0B]",
    borderClass: "border-[#F59E0B]/30",
  },
} as const

export type FarmingFlag = keyof typeof FARMING_FLAGS

// ── Score Dimensions ─────────────────────────────────────────────────────────

export const SCORE_DIMENSIONS = [
  {
    key: "teachingValue" as const,
    label: "Teaching Value",
    description: "Does this help someone understand something?",
    color: "#10B981",
  },
  {
    key: "originality" as const,
    label: "Originality",
    description: "Is this a new insight or recycled alpha?",
    color: "#A855F7",
  },
  {
    key: "communityImpact" as const,
    label: "Community Impact",
    description: "Does this serve the community?",
    color: "#06B6D4",
  },
]

// ── Platform Labels ───────────────────────────────────────────────────────────

export const PLATFORMS = {
  twitter: { label: "Twitter/X", icon: "Twitter" },
  reddit: { label: "Reddit", icon: "MessageCircle" },
  discord: { label: "Discord", icon: "MessageSquare" },
  telegram: { label: "Telegram", icon: "Send" },
  github: { label: "GitHub", icon: "Github" },
} as const

export type Platform = keyof typeof PLATFORMS

// ── Supported Chains ─────────────────────────────────────────────────────────

export const CHAINS = {
  avalanche: { label: "Avalanche", chainId: 43114, symbol: "AVAX" },
  base: { label: "Base", chainId: 8453, symbol: "ETH" },
  solana: { label: "Solana", chainId: null, symbol: "SOL" },
} as const

export type Chain = keyof typeof CHAINS

// ── Demo Tweets ───────────────────────────────────────────────────────────────

export const DEMO_TWEETS = [
  {
    id: "educator",
    label: "The Educator",
    text: `Thread: How does a DeFi liquidation engine actually work?

Most people don't realize that liquidations aren't instant — there's a cascade mechanic.

1/ When your health factor drops below 1, you're eligible for liquidation — but someone has to trigger it.

2/ Liquidators pay off your debt in exchange for your collateral + a liquidation bonus (typically 5-10%).

3/ The key risk: if collateral price drops faster than liquidators can act, the protocol becomes insolvent.

4/ This is why Aave has a "bad debt" reserve and Compound has a "protocol surplus." They're insurance buffers.

5/ The edge case everyone misses: flash loan liquidations. An attacker can borrow, liquidate, and repay in one tx — no capital required. This is legitimate, but it means your liquidation can happen instantly even in thin markets.

Understanding this changes how you think about your collateral ratio.`,
    expectedFlag: "genuine" as const,
  },
  {
    id: "farmer",
    label: "The Farmer",
    text: "GM wagmi!! Love this project so much 🚀🚀🚀 $TOKEN to the moon!! Who else is bullish?? RT if you're holding!! LFG!!!! 🔥🔥🔥 #DeFi #crypto #web3 #NFT #altseason",
    expectedFlag: "farming" as const,
  },
  {
    id: "borderline",
    label: "The Borderline",
    text: "The new Aave v3 update is interesting. Supply caps per asset are a smart risk management move — prevents one asset from dominating collateral and creating systemic risk. Worth watching how this plays out with the ETH LST integrations.",
    expectedFlag: "ambiguous" as const,
  },
] as const

export type DemoTweetId = (typeof DEMO_TWEETS)[number]["id"]
