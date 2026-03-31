"use client"

/**
 * Client hook for the marketing AI Judge demo: POST `/api/judge`, parse NDJSON stream for live partials and final `JudgeResult`.
 */

import { useState } from "react"
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
  result: JudgeResult | null
  liveScore: LiveScore | null
  error: string | null
}

/** Returns judge state, `score(text)` (streaming), and `reset`; fires analytics and toast notifications on completion/error. */
export function useAiJudge() {
  const notify = useNotificationStore((s) => s.push)
  const [state, setState] = useState<AiJudgeState>({
    status: "idle",
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
  const parseStream = async (res: Response): Promise<JudgeResult> => {
    const reader = res.body?.getReader()
    if (!reader) throw new Error("Scoring stream unavailable")

    const decoder = new TextDecoder()
    let buffer = ""
    let finalResult: JudgeResult | null = null

    while (true) {
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
            | { type: "final"; result: JudgeResult }
            | { type: "status"; phase: string }

          if (msg.type === "partial") {
            setState((prev) => ({ ...prev, liveScore: msg.partial }))
          }

          if (msg.type === "final") {
            finalResult = msg.result
          }
        }

        newLineIdx = buffer.indexOf("\n")
      }
    }

    if (!finalResult) throw new Error("Scoring finished without a final result")
    return finalResult
  }

  const score = async (text: string) => {
    setState({ status: "scoring", result: null, liveScore: null, error: null })
    events.aiJudgeDemo("custom")

    try {
      const res = await fetch("/api/judge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || `Scoring failed (${res.status})`)
      }

      const result = await parseStream(res)

      setState({ status: "complete", result, liveScore: null, error: null })
      events.aiJudgeResult(result.farmingFlag, result.compositeScore)
      notify({
        type: "success",
        title: "Judge score complete",
        message: `Composite ${result.compositeScore}/100 (${result.farmingFlag})`,
      })
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Scoring failed. Please try again."
      setState({ status: "error", result: null, liveScore: null, error: message })
      notify({ type: "error", title: "Judge scoring failed", message })
    }
  }

  const reset = () =>
    setState({ status: "idle", result: null, liveScore: null, error: null })

  return { ...state, score, reset }
}
