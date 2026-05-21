"use client"

/**
 * Client hook for the marketing AI Judge demo: POST `/api/judge`, parse NDJSON stream for live partials and final `JudgeResult`.
 */

import { useCallback, useRef, useState } from "react"
import type { JudgeResult } from "@/types/api"
import { events } from "@/lib/analytics"
import { useNotificationStore } from "@/stores/useNotificationStore"

interface LiveScore {
  teachingValue: number
  originality: number
  communityImpact: number
}

interface AiJudgeState {
  status: "idle" | "scoring" | "complete" | "error"
  phase: string | null
  result: JudgeResult | null
  liveScore: LiveScore | null
  error: string | null
}

export type AiJudgeScores = {
  teaching_value: number
  originality: number
  community_impact: number
}

function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(100, Math.max(0, Math.round(value)))
}

function liveScoreToCanonical(live: LiveScore | null): AiJudgeScores {
  return {
    teaching_value: clampScore(live?.teachingValue ?? 0),
    originality: clampScore(live?.originality ?? 0),
    community_impact: clampScore(live?.communityImpact ?? 0),
  }
}

/** Returns judge state, `score(text)` (streaming), and `reset`; fires analytics and toast notifications on completion/error. */
export function useAiJudge(onScoreUpdate?: (scoreType: string, value: number) => void) {
  const notify = useNotificationStore((s) => s.push)
  const abortControllerRef = useRef<AbortController | null>(null)
  const [state, setState] = useState<AiJudgeState>({
    status: "idle",
    phase: null,
    result: null,
    liveScore: null,
    error: null,
  })

  /**
   * Parse NDJSON (newline-delimited JSON) from the /api/judge stream.
   *
   * The server sends three message types:
   *   1. { type: "status" }  — phase indicator ("reading")
   *   2. { type: "partial" } — intermediate scores that animate the bars
   *   3. { type: "final" }   — complete JudgeResult
   *
   * We buffer incoming chunks because a single read() may deliver a
   * partial JSON line; splitting on "\n" and only parsing complete lines
   * avoids JSON.parse failures on partial data.
   */
  const parseStream = useCallback(async (res: Response, signal: AbortSignal): Promise<JudgeResult> => {
    const reader = res.body?.getReader()
    if (!reader) throw new Error("Scoring stream unavailable")

    const decoder = new TextDecoder()
    let buffer = ""
    let finalResult: JudgeResult | null = null

    const applyLiveScore = (score: LiveScore) => {
      setState((prev) => ({ ...prev, liveScore: score }))
      if (onScoreUpdate) {
        onScoreUpdate("teaching_value", clampScore(score.teachingValue))
        onScoreUpdate("originality", clampScore(score.originality))
        onScoreUpdate("community_impact", clampScore(score.communityImpact))
      }
    }

    const normalizeFinalResult = (value: unknown): JudgeResult | null => {
      if (!value || typeof value !== "object") return null

      const candidate = value as Partial<JudgeResult> & {
        result?: unknown
        analysis?: unknown
        score?: unknown
      }
      const source = candidate.result ?? candidate.analysis ?? candidate.score ?? candidate

      if (!source || typeof source !== "object") return null

      const sourceRecord = source as Partial<JudgeResult>
      if (
        typeof sourceRecord.teachingValue !== "number" ||
        typeof sourceRecord.originality !== "number" ||
        typeof sourceRecord.communityImpact !== "number" ||
        typeof sourceRecord.compositeScore !== "number" ||
        typeof sourceRecord.farmingFlag !== "string"
      ) {
        return null
      }

      return {
        teachingValue: sourceRecord.teachingValue,
        originality: sourceRecord.originality,
        communityImpact: sourceRecord.communityImpact,
        compositeScore: sourceRecord.compositeScore,
        farmingFlag: sourceRecord.farmingFlag as JudgeResult["farmingFlag"],
        farmingExplanation: sourceRecord.farmingExplanation ?? "",
        dimensionExplanations: sourceRecord.dimensionExplanations ?? {
          teachingValue: "",
          originality: "",
          communityImpact: "",
        },
        scoredAt: sourceRecord.scoredAt ?? new Date().toISOString(),
      }
    }

    while (true) {
      if (signal.aborted) throw new DOMException("The request was aborted.", "AbortError")

      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })

      // Process all complete lines currently in the buffer
      let newLineIdx = buffer.indexOf("\n")
      while (newLineIdx !== -1) {
        const line = buffer.slice(0, newLineIdx).trim()
        buffer = buffer.slice(newLineIdx + 1)

        if (line) {
          const msg = JSON.parse(line) as
            | { type: "partial"; partial: LiveScore }
            | { type: "tweet_score"; score?: LiveScore; teachingValue?: number; originality?: number; communityImpact?: number }
            | { type: "final"; result?: JudgeResult; analysis?: JudgeResult; score?: JudgeResult }
            | { type: "status"; phase: string; message?: string }
            | { type: "error"; message: string }

          if (msg.type === "partial") {
            applyLiveScore(msg.partial)
          } else if (msg.type === "tweet_score") {
            const liveScore: LiveScore | null = msg.score ?? (
              typeof msg.teachingValue === "number" &&
              typeof msg.originality === "number" &&
              typeof msg.communityImpact === "number"
                ? {
                    teachingValue: msg.teachingValue,
                    originality: msg.originality,
                    communityImpact: msg.communityImpact,
                  }
                : null
            )

            if (liveScore) applyLiveScore(liveScore)
          } else if (msg.type === "status") {
            setState((prev) => ({ ...prev, phase: msg.phase }))
          } else if (msg.type === "error") {
            throw new Error(msg.message)
          } else if (msg.type === "final") {
            finalResult = normalizeFinalResult(msg)
          }
        }

        newLineIdx = buffer.indexOf("\n")
      }
    }

    if (buffer.trim()) {
      const msg = JSON.parse(buffer.trim()) as { type: string }
      if (msg.type === "final") {
        finalResult = normalizeFinalResult(msg)
      }
    }

    if (!finalResult) throw new Error("Scoring finished without a final result")
    return finalResult
  }, [onScoreUpdate])

  const score = async (text: string) => {
    abortControllerRef.current?.abort()
    const abortController = new AbortController()
    abortControllerRef.current = abortController

    setState({ status: "scoring", phase: null, result: null, liveScore: null, error: null })
    events.aiJudgeDemo("custom")

    try {
      const res = await fetch("/api/judge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
        signal: abortController.signal,
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `Scoring failed (${res.status})`)
      }

      const result = await parseStream(res, abortController.signal)

      setState({ status: "complete", phase: null, result, liveScore: null, error: null })
      events.aiJudgeResult(result.farmingFlag, result.compositeScore)
      notify({
        type: "success",
        title: "Judge score complete",
        message: `Composite ${result.compositeScore}/100 (${result.farmingFlag})`,
      })
    } catch (err) {
      if (abortController.signal.aborted) return

      const message =
        err instanceof Error ? err.message : "Scoring failed. Please try again."
      setState({ status: "error", phase: null, result: null, liveScore: null, error: message })
      notify({ type: "error", title: "Judge scoring failed", message })
    }
  }

  const reset = () => {
    abortControllerRef.current?.abort()
    setState({ status: "idle", phase: null, result: null, liveScore: null, error: null })
  }

  const scores = state.result
    ? {
        teaching_value: clampScore(state.result.teachingValue),
        originality: clampScore(state.result.originality),
        community_impact: clampScore(state.result.communityImpact),
      }
    : liveScoreToCanonical(state.liveScore)

  const totalScore = state.result?.compositeScore ?? Math.round(
    (scores.teaching_value + scores.originality + scores.community_impact) / 3
  )

  const isFarming = state.result?.farmingFlag === "farming"
  const isLoading = state.status === "scoring"

  return {
    ...state,
    isLoading,
    scores,
    totalScore,
    isFarming,
    score,
    reset,
  }
}
