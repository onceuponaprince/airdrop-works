"use client"

/**
 * Landing-page interactive demo: preset tweets or custom text, streaming score via `useAiJudge`, then `ScoreCard` + waitlist CTA.
 */

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Loader2, Zap } from "lucide-react"
import { ArcadeButton } from "@/components/themed/ArcadeButton"
import { ArcadeCard } from "@/components/themed/ArcadeCard"
import { ScoreCard } from "@/components/app/ScoreCard"
import { AnimatedSection } from "@/components/shared/AnimatedSection"
import { useAiJudge } from "@/hooks/useAiJudge"
import { DEMO_TWEETS } from "@/lib/constants"
import { cn } from "@/lib/utils"
import { fadeInUp } from "@/styles/theme"

/** Marketing section wiring input presets, judge API, loading/live partials, result card, and error retry. */
export function AiJudgeDemo() {
  const [inputText, setInputText] = useState("")
  const [activeDemoId, setActiveDemoId] = useState<string | null>(null)
  const { status, result, liveScore, error, score, reset } = useAiJudge()

  const handleDemoSelect = (id: string, text: string) => {
    setActiveDemoId(id)
    setInputText(text)
    reset()
  }

  const handleScore = () => {
    const text = inputText.trim()
    if (!text) return
    setActiveDemoId(null)
    score(text)
  }

  const handleReset = () => {
    reset()
    setInputText("")
    setActiveDemoId(null)
  }

  const isScoring = status === "scoring"
  const hasResult = status === "complete" && result

  return (
    <section id="ai-judge-demo" className="py-24 bg-card/30">
      <div className="max-w-[960px] mx-auto px-4 sm:px-6">
        <AnimatedSection className="text-center mb-12">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-3">
            See the Difference
          </p>
          <h2 className="font-heading text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Paste a Tweet. Get Scored.
          </h2>
          <p className="font-body text-muted-foreground max-w-[520px] mx-auto">
            The AI Judge reads your contribution and scores it across three
            dimensions. No gaming the system — quality is the only metric.
          </p>
        </AnimatedSection>

        <div className="grid lg:grid-cols-2 gap-8 items-start">
          {/* Left — input panel */}
          <motion.div {...fadeInUp} className="space-y-4">
            {/* Demo tweet selectors */}
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
                Try a preset
              </p>
              <div className="flex flex-wrap gap-2">
                {DEMO_TWEETS.map((demo) => (
                  <button
                    key={demo.id}
                    onClick={() => handleDemoSelect(demo.id, demo.text)}
                    className={cn(
                      "px-3 py-1.5 rounded-sm border text-xs font-mono transition-all",
                      activeDemoId === demo.id
                        ? "bg-primary/10 border-primary/60 text-primary"
                        : "bg-transparent border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                    )}
                  >
                    {demo.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Text input */}
            <div className="space-y-2">
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Or paste your own
              </p>
              <textarea
                value={inputText}
                onChange={(e) => {
                  setInputText(e.target.value)
                  setActiveDemoId(null)
                  reset()
                }}
                placeholder="Paste a tweet URL or text..."
                rows={6}
                className={cn(
                  "w-full rounded-[var(--radius)] border bg-transparent px-4 py-3",
                  "font-body text-sm text-foreground placeholder:text-muted-foreground/50",
                  "resize-none transition-colors",
                  "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background",
                  "border-border focus:border-primary/50"
                )}
                maxLength={5000}
              />
              <div className="flex justify-between items-center">
                <span className="font-mono text-[10px] text-muted-foreground/40">
                  {inputText.length}/5000
                </span>
                {inputText && (
                  <button
                    onClick={handleReset}
                    className="font-mono text-[10px] text-muted-foreground/40 hover:text-muted-foreground transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Score button */}
            <ArcadeButton
              size="lg"
              className="w-full"
              onClick={handleScore}
              loading={isScoring}
              disabled={!inputText.trim() || isScoring}
              icon={!isScoring ? <Zap size={16} /> : undefined}
            >
              {isScoring ? "Scoring…" : "Score This"}
            </ArcadeButton>

            {/* Score legend */}
            <div className="grid grid-cols-3 gap-3 pt-2">
              {[
                { label: "Teaching Value",    color: "#10B981", desc: "Does this help someone understand something?" },
                { label: "Originality",       color: "#A855F7", desc: "Is this a new insight or recycled alpha?" },
                { label: "Community Impact",  color: "#06B6D4", desc: "Does this serve the community?" },
              ].map((dim) => (
                <div key={dim.label} className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: dim.color }} />
                    <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">{dim.label}</span>
                  </div>
                  <p className="font-body text-[10px] text-muted-foreground/50 leading-snug">{dim.desc}</p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Right — score card or placeholder */}
          <div className="relative min-h-[340px] flex items-center justify-center">
            <AnimatePresence mode="wait">
              {hasResult ? (
                <motion.div
                  key="result"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="w-full"
                >
                  <ScoreCard
                    result={result}
                    showReset
                    onReset={handleReset}
                    showShare
                  />
                  {/* Post-score CTA */}
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 1.6 }}
                    className="mt-4 p-4 rounded-[var(--radius)] border border-primary/20 bg-primary/5 text-center"
                  >
                    <p className="font-body text-xs text-muted-foreground mb-3">
                      This is one tweet. Imagine scoring everything you&apos;ve ever written.
                    </p>
                    <ArcadeButton
                      size="sm"
                      onClick={() => document.getElementById("waitlist")?.scrollIntoView({ behavior: "smooth" })}
                    >
                      Join Waitlist
                    </ArcadeButton>
                  </motion.div>
                </motion.div>
              ) : isScoring ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="w-full flex flex-col items-center gap-4"
                >
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full border border-primary/20 flex items-center justify-center">
                      <Loader2 className="w-6 h-6 text-primary animate-spin" />
                    </div>
                    <motion.div
                      animate={{ scale: [1, 1.4, 1], opacity: [0.4, 0, 0.4] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                      className="absolute inset-0 rounded-full border border-primary/30"
                    />
                  </div>
                  <div className="text-center space-y-1">
                    <p className="font-mono text-xs text-primary">AI Judge scoring…</p>
                    <p className="font-body text-xs text-muted-foreground">Reading for quality, not likes</p>
                  </div>

                  {liveScore ? (
                    <div className="w-full rounded-[var(--radius)] border border-primary/30 bg-primary/5 p-4 space-y-3">
                      <p className="font-mono text-[10px] uppercase tracking-widest text-primary">Live Score Reveal</p>
                      {[
                        { label: 'Teaching Value', value: liveScore.teachingValue },
                        { label: 'Originality', value: liveScore.originality },
                        { label: 'Community Impact', value: liveScore.communityImpact },
                      ].map((row) => (
                        <div key={row.label} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">{row.label}</span>
                            <span className="font-mono text-primary">{row.value}</span>
                          </div>
                          <div className="h-2 rounded bg-secondary overflow-hidden">
                            <motion.div
                              className="h-full bg-primary"
                              initial={{ width: 0 }}
                              animate={{ width: `${row.value}%` }}
                              transition={{ duration: 0.3 }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </motion.div>
              ) : error ? (
                <motion.div
                  key="error"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="w-full"
                >
                  <ArcadeCard className="text-center p-8 border-destructive/30">
                    <p className="font-body text-sm text-destructive mb-3">{error}</p>
                    <ArcadeButton size="sm" variant="secondary" onClick={handleReset}>
                      Try Again
                    </ArcadeButton>
                  </ArcadeCard>
                </motion.div>
              ) : (
                <motion.div
                  key="placeholder"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="w-full"
                >
                  <ArcadeCard className="border-dashed border-border/60 text-center p-12">
                    <div className="space-y-3">
                      <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto">
                        <Zap size={20} className="text-primary/60" />
                      </div>
                      <p className="font-body text-sm text-muted-foreground">
                        Select a demo tweet or paste your own, then hit{" "}
                        <span className="text-primary">Score This</span>.
                      </p>
                      <div className="flex items-center gap-2 justify-center pt-2">
                        {["87", "72", "91"].map((n, i) => (
                          <div key={i} className="flex flex-col items-center">
                            <span className="font-mono text-xl text-foreground/20">{n}</span>
                            <div className="w-8 h-1 bg-foreground/10 rounded-full mt-1" />
                          </div>
                        ))}
                      </div>
                    </div>
                  </ArcadeCard>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  )
}
