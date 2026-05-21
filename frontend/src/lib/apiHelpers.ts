import type { PaginatedResponse } from "@/types/api"
import type { JudgeResult } from "@/types/api"

/** DRF list endpoints return either a paginated object or a bare array. */
export function unwrapList<T>(payload: PaginatedResponse<T> | T[] | null | undefined): T[] {
  if (!payload) return []
  if (Array.isArray(payload)) return payload
  if (typeof payload === "object" && "results" in payload && Array.isArray(payload.results)) {
    return payload.results
  }
  return []
}

/** Map Django judge score payload (snake_case) to frontend JudgeResult. */
export function mapJudgeResult(raw: Record<string, unknown>): JudgeResult {
  const dim = (raw.dimension_explanations ?? raw.dimensionExplanations ?? {}) as Record<
    string,
    string
  >
  return {
    teachingValue: Number(raw.teaching_value ?? raw.teachingValue ?? 0),
    originality: Number(raw.originality ?? 0),
    communityImpact: Number(raw.community_impact ?? raw.communityImpact ?? 0),
    compositeScore: Number(raw.composite_score ?? raw.compositeScore ?? 0),
    farmingFlag: (raw.farming_flag ?? raw.farmingFlag ?? "ambiguous") as JudgeResult["farmingFlag"],
    farmingExplanation: String(raw.farming_explanation ?? raw.farmingExplanation ?? ""),
    dimensionExplanations: {
      teachingValue: dim.teaching_value ?? dim.teachingValue ?? "",
      originality: dim.originality ?? "",
      communityImpact: dim.community_impact ?? dim.communityImpact ?? "",
    },
    scoredAt: String(raw.scored_at ?? raw.scoredAt ?? new Date().toISOString()),
  }
}

/** Normalize contribution rows from API (snake or camel). */
export function mapContribution(raw: Record<string, unknown>) {
  return {
    id: String(raw.id),
    user: String(raw.user ?? ""),
    platform: raw.platform as string,
    contentText: String(raw.content_text ?? raw.contentText ?? ""),
    contentUrl: (raw.content_url ?? raw.contentUrl) as string | undefined,
    teachingValue: raw.teaching_value ?? raw.teachingValue,
    originality: raw.originality,
    communityImpact: raw.community_impact ?? raw.communityImpact,
    totalScore: raw.total_score ?? raw.totalScore,
    farmingFlag: raw.farming_flag ?? raw.farmingFlag,
    xpAwarded: Number(raw.xp_awarded ?? raw.xpAwarded ?? 0),
    scoredAt: (raw.scored_at ?? raw.scoredAt) as string | undefined,
    discoveredAt: String(raw.created_at ?? raw.discoveredAt ?? raw.createdAt ?? ""),
  }
}
