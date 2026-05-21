"use client"

import { useCallback, useState } from "react"
import { events } from "@/lib/analytics"

export interface MarketingDimensions {
  hook: number
  clarity: number
  audienceFit: number
  ctaStrength: number
  fatigueRisk: number
}

export interface MarketingJudgeResult {
  rubricKey: string
  compositeScore: number
  fatigueRisk: string
  dimensions: MarketingDimensions
  dimensionExplanations: Record<string, string>
  scoredAt: string
}

export function useMarketingJudge() {
  const [status, setStatus] = useState<"idle" | "scoring" | "complete" | "error">("idle")
  const [result, setResult] = useState<MarketingJudgeResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const score = useCallback(async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed) return

    setStatus("scoring")
    setError(null)
    setResult(null)

    try {
      const res = await fetch("/api/v1/judge/demo/marketing/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: trimmed }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error((body as { detail?: string }).detail || "Scoring failed")
      }
      const data = (await res.json()) as MarketingJudgeResult
      setResult(data)
      setStatus("complete")
      events.marketingDemoComplete(data.compositeScore, data.fatigueRisk)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Scoring failed"
      setError(message)
      setStatus("error")
      events.marketingDemoFail(message)
    }
  }, [])

  const reset = useCallback(() => {
    setStatus("idle")
    setResult(null)
    setError(null)
  }, [])

  return { status, result, error, score, reset }
}
