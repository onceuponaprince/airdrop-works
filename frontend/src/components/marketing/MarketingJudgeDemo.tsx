"use client"

import { useState } from "react"
import Link from "next/link"
import { Loader2 } from "lucide-react"
import { ArcadeButton } from "@/components/themed/ArcadeButton"
import { ArcadeCard } from "@/components/themed/ArcadeCard"
import { useMarketingJudge } from "@/hooks/useMarketingJudge"
import { events } from "@/lib/analytics"
import { cn } from "@/lib/utils"

const DEMO_COPY = [
  {
    id: "launch",
    label: "Launch promo",
    text: "Ship faster with AI(r)Drop Growth — 50% off annual plans this week. Start free →",
  },
  {
    id: "founder",
    label: "Founder story",
    text: "We built the judge crypto teams actually trust. Paste your tweet, get scored in seconds. Join the waitlist.",
  },
  {
    id: "fatigued",
    label: "Fatigued cliché",
    text: "🚀🚀🚀 DON'T MISS OUT!!! Revolutionary Web3 innovation. Act NOW. Limited time!!!",
  },
] as const

const DIMENSION_LABELS: Record<string, string> = {
  hook: "Hook",
  clarity: "Clarity",
  audienceFit: "Audience fit",
  ctaStrength: "CTA strength",
  fatigueRisk: "Fatigue risk",
}

export function MarketingJudgeDemo() {
  const [input, setInput] = useState("")
  const { status, result, error, score, reset } = useMarketingJudge()

  const handleScore = () => {
    events.marketingDemoScore("custom")
    void score(input)
  }

  return (
    <section className="py-20">
      <div className="max-w-[880px] mx-auto px-4 sm:px-6 space-y-8">
        <div className="text-center space-y-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Performance Marketing Judge
          </p>
          <h1 className="font-heading text-3xl sm:text-4xl font-bold">Score your ad copy</h1>
          <p className="text-muted-foreground max-w-lg mx-auto text-sm">
            Hook, clarity, audience fit, CTA, and fatigue risk — separate from the Web3 contribution
            rubric on the main homepage.
          </p>
        </div>

        <ArcadeCard className="p-6 space-y-4">
          <div className="flex flex-wrap gap-2">
            {DEMO_COPY.map((sample) => (
              <button
                key={sample.id}
                type="button"
                className="text-xs px-3 py-1.5 rounded-full border border-border hover:border-primary hover:text-primary transition-colors"
                onClick={() => {
                  setInput(sample.text)
                  reset()
                }}
              >
                {sample.label}
              </button>
            ))}
          </div>

          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={5}
            placeholder="Paste ad copy, landing hero, or social post…"
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm resize-y"
          />

          <div className="flex flex-wrap gap-3">
            <ArcadeButton type="button" onClick={handleScore} disabled={status === "scoring" || !input.trim()}>
              {status === "scoring" ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Scoring…
                </>
              ) : (
                "Score copy"
              )}
            </ArcadeButton>
            {result && (
              <button
                type="button"
                onClick={() => {
                  reset()
                  setInput("")
                }}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                Reset
              </button>
            )}
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </ArcadeCard>

        {result && (
          <ArcadeCard className="p-6 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Composite</p>
                <p className="text-4xl font-bold text-primary">{result.compositeScore}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Fatigue</p>
                <p className="font-semibold capitalize">{result.fatigueRisk}</p>
              </div>
            </div>
            <div className="space-y-3">
              {Object.entries(result.dimensions).map(([key, value]) => (
                <div key={key}>
                  <div className="flex justify-between text-xs mb-1">
                    <span>{DIMENSION_LABELS[key] ?? key}</span>
                    <span className="font-mono">{value}</span>
                  </div>
                  <div className="h-2 rounded-full bg-secondary overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        key === "fatigueRisk" ? "bg-destructive/80" : "bg-primary"
                      )}
                      style={{ width: `${Math.min(100, value)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground font-mono">Rubric: {result.rubricKey}</p>
          </ArcadeCard>
        )}

        {result && (
          <div className="text-center">
            <Link
              href="/signup"
              className="inline-flex items-center justify-center px-6 py-3 rounded-md bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90"
            >
              Join the waitlist for full campaigns
            </Link>
          </div>
        )}
      </div>
    </section>
  )
}
