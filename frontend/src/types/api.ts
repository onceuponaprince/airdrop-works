import type { Branch, RarityTier, DifficultyRating, FarmingFlag, Platform, Chain } from "@/lib/constants"

// ── AI Judge ─────────────────────────────────────────────────────────────────

export interface ScoreDimensions {
  teachingValue: number   // 0–100
  originality: number     // 0–100
  communityImpact: number // 0–100
}

export interface JudgeResult extends ScoreDimensions {
  compositeScore: number
  farmingFlag: FarmingFlag
  farmingExplanation: string
  dimensionExplanations: {
    teachingValue: string
    originality: string
    communityImpact: string
  }
  scoredAt: string
}

export interface DemoScoreRequest {
  text: string
}

export interface ScoreRequest {
  contributionId: string
}

export interface ScoreTaskResponse {
  taskId: string
  status: "pending" | "scoring" | "complete" | "failed"
  result?: JudgeResult
}

// ── User / Auth ───────────────────────────────────────────────────────────────

export interface User {
  id: string
  walletAddress: string
  email?: string
  dynamicUserId?: string
  createdAt: string
}

export interface AuthTokens {
  access: string
  refresh: string
}

export interface WalletVerifyRequest {
  walletAddress: string
  message: string
  signature: string
}

// ── Profile ───────────────────────────────────────────────────────────────────

export interface Profile {
  id: string
  user: User
  totalXp: number
  educatorXp: number
  builderXp: number
  creatorXp: number
  scoutXp: number
  diplomatXp: number
  skillTreeState: Record<string, string> // { nodeId: unlockedAt }
  rank: number | null
  badges: Badge[]
  createdAt: string
  updatedAt: string
}

export interface SkillNode {
  id: string
  branch: Branch
  tier: number
  name: string
  description: string
  xpCost: number
  bonusMultiplier: number
  prerequisiteNodeIds: string[]
  position: { x: number; y: number }
}

// ── Contributions ─────────────────────────────────────────────────────────────

export interface Contribution {
  id: string
  user: string
  platform: Platform
  contentText: string
  contentUrl?: string
  teachingValue?: number
  originality?: number
  communityImpact?: number
  totalScore?: number
  farmingFlag?: FarmingFlag
  xpAwarded: number
  scoredAt?: string
  discoveredAt: string
}

export type CrawlSourcePlatform = "twitter" | "reddit" | "discord" | "telegram"

export interface CrawlSourceRunMetadata {
  lastStatus?: "ok" | "failed"
  lastFetchedCount?: number
  lastCreatedCount?: number
  lastRunAt?: string
  lastCursor?: string
}

export interface CrawlSourceConfig {
  id: string
  platform: CrawlSourcePlatform
  sourceKey: string
  isActive: boolean
  cursor: string
  lastCrawledAt: string | null
  lastError: string
  metadata: CrawlSourceRunMetadata & Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface QueuedTaskResponse {
  taskId: string
  status: "queued"
}

// ── Quests ────────────────────────────────────────────────────────────────────

export interface Quest {
  id: string
  title: string
  description: string
  difficulty: DifficultyRating
  rewardPool: string
  rewardToken: string
  chain: Chain
  scoringRubric: Record<string, number>
  startDate: string
  endDate: string
  maxParticipants?: number
  partySize?: number
  participantCount: number
  status: "upcoming" | "active" | "completed"
  projectName: string
  projectLogoUrl?: string
}

export interface QuestAcceptance {
  questId: string
  userId: string
  acceptedAt: string
  status: "active" | "completed" | "expired"
}

// ── Leaderboard ───────────────────────────────────────────────────────────────

export interface LeaderboardEntry {
  rank: number
  user: {
    id: string
    walletAddress: string
    displayName?: string
    avatarUrl?: string
  }
  totalXp: number
  primaryBranch: Branch
  weeklyXp: number
  contributionCount: number
}

// ── Loot & Rewards ────────────────────────────────────────────────────────────

export interface LootItem {
  id: string
  rarity: RarityTier
  type: "badge" | "innovator_token" | "multiplier"
  name: string
  description: string
  amount?: number
  imageUrl?: string
  opened: boolean
  receivedAt: string
}

export interface Badge {
  id: string
  name: string
  description: string
  imageUrl: string
  rarity: RarityTier
  earnedAt: string
  nftTokenId?: string
  chain?: Chain
}

export interface LootChestOpenResult {
  item: LootItem
  animationData: {
    rarity: RarityTier
    delay: number
  }
}

// ── Twitter Account Analysis ─────────────────────────────────────────────────

export interface TweetScore {
  index: number
  tweetId: string
  text: string
  url: string
  teachingValue: number
  originality: number
  communityImpact: number
  compositeScore: number
  farmingFlag: FarmingFlag
  oneLiner: string
}

export interface AccountAggregate {
  overallScore: number
  teachingValue: number
  originality: number
  communityImpact: number
  farmingPercentage: number
  genuinePercentage: number
  strengths: string
  weaknesses: string
  verdict: FarmingFlag
}

export interface AccountAnalysis {
  username: string
  displayName?: string
  avatarUrl?: string
  tweetCount: number
  tweets: TweetScore[]
  aggregate: AccountAggregate
  analyzedAt: string
}

// ── Waitlist ──────────────────────────────────────────────────────────────────

export interface WaitlistEntry {
  email: string
  walletAddress?: string
  primaryBranch?: Branch
  referralCode?: string
  source?: string
}

export interface WaitlistResponse {
  rank: number
  referralLink: string
  alreadyRegistered: boolean
}

// ── Pagination ────────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  count: number
  next: string | null
  previous: string | null
  results: T[]
}

// ── SPORE / Phase 3 ───────────────────────────────────────────────────────────

export interface SporeBriefGenerateRequest {
  brand: string
  audience: string
  platform: "twitter" | "discord" | "telegram" | "github"
  tone: string
  objective: string
  budget?: string
  conceptCount?: number
}

export interface SporeGeneratedConcept {
  title: string
  copy: string
  engagementPrediction: number
  riskScore: number
  confidenceInterval: [number, number]
  riskFlags: string[]
}

export interface SporeBriefGenerateResponse {
  concepts: SporeGeneratedConcept[]
  model: string
}

export interface SporeGraphQueryRequest {
  queryText: string
  hops?: number
  damping?: number
  topK?: number
}

export interface SporeGraphNode {
  id: string
  nodeKey: string
  nodeType: string
  title: string
  sourcePlatform: string
  payload: Record<string, unknown>
  ingestionBatchId: string
  rawRef: string
  updatedAt: string
}

export interface SporeGraphQueryResultRow {
  nodeKey: string
  activation: number
  node: SporeGraphNode
}

export interface SporeGraphQueryResponse {
  queryHash: string
  seedNodes: string[]
  results: SporeGraphQueryResultRow[]
}

export interface SporeTwitterRelationshipResponse {
  accountA: string
  accountB: string
  days: number
  features: Record<string, number>
}

export interface SporeOpsSummaryResponse {
  nodesTotal: number
  edgesTotal: number
  observationsTotal: number
  scoreRunsTotal: number
  recentScoreRuns24h: number
  avgFinalScore: number
}

export interface SporeScoreRun {
  id: string
  contributionId: string
  sourcePlatform: string
  scoreVersion: string
  context: Record<string, unknown>
  variableScores: Record<string, number>
  explainability: Record<string, string>
  confidence: number
  finalScore: number
  createdAt: string
}

export interface SporeScoreRunListResponse {
  count: number
  results: SporeScoreRun[]
}

export interface SporeGraphQueryRun {
  id: string
  queryText: string
  queryHash: string
  hops: number
  damping: number
  topK: number
  seedNodes: string[]
  resultCount: number
  results: Array<Record<string, unknown>>
  createdAt: string
}

export interface SporeGraphQueryRunListResponse {
  count: number
  results: SporeGraphQueryRun[]
}

export interface SporeRelationshipRun {
  id: string
  accountA: string
  accountB: string
  days: number
  features: Record<string, number>
  createdAt: string
}

export interface SporeRelationshipRunListResponse {
  count: number
  results: SporeRelationshipRun[]
}

export interface SporeTenant {
  id: string
  slug: string
  name: string
  isActive: boolean
  plan: string
  quotaDailyQuery: number
  quotaDailyIngest: number
  quotaDailyRelationship: number
  quotaDailyBriefGenerate: number
  metadata: Record<string, unknown>
}

export interface SporeTenantMembership {
  tenant: SporeTenant
  role: "owner" | "admin" | "member" | "viewer"
}

export interface SporeTenantContextResponse {
  activeTenant: SporeTenant
  memberships: SporeTenantMembership[]
}

export interface SporeApiKey {
  id: string
  tenant: SporeTenant
  name: string
  prefix: string
  isActive: boolean
  lastUsedAt: string | null
  createdAt: string
  metadata: Record<string, unknown>
}

export interface SporeApiKeyListResponse {
  count: number
  results: SporeApiKey[]
}

export interface SporeUsageEvent {
  id: string
  metric: string
  units: number
  statusCode: number
  requestId: string
  metadata: Record<string, unknown>
  createdAt: string
}

export interface SporeUsageEventListResponse {
  count: number
  results: SporeUsageEvent[]
}

export interface SporeAuditLog {
  id: string
  action: string
  targetType: string
  targetId: string
  metadata: Record<string, unknown>
  createdAt: string
}

export interface SporeAuditLogListResponse {
  count: number
  results: SporeAuditLog[]
}

export interface SubscriptionStatusResponse {
  tenantSlug: string
  plan: "starter" | "growth" | "enterprise" | null
  status: "active" | "cancelled" | "past_due" | "trialing" | "incomplete" | "none"
  portalAvailable: boolean
  cancelAtPeriodEnd: boolean
  currentPeriodEnd: string | null
}
