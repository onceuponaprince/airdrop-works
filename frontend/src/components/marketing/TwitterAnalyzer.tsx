"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Loader2, Search, Twitter } from "lucide-react"
import { ArcadeButton } from "@/components/themed/ArcadeButton"
import { ArcadeCard } from "@/components/themed/ArcadeCard"
import { AccountScoreCard } from "@/components/app/AccountScoreCard"
import { AnimatedSection } from "@/components/shared/AnimatedSection"
import { useTwitterAnalyze } from "@/hooks/useTwitterAnalyze"
import { cn } from "@/lib/utils"
import { FARMING_FLAGS } from "@/lib/constants"
import { fadeInUp } from "@/styles/theme"

export function TwitterAnalyzer() {
  const [handle, setHandle] = useState("")
  const {
    status,
    analysis,
    tweetScores,
    tweetsFetched,
    statusMessage,
    error,
    analyze,
    reset,
  } = useTwitterAnalyze()

  const handleAnalyze = () => {
    const cleaned = handle.trim().replace(/^@/, "")
    if (!cleaned) return
    analyze(cleaned)
  }

  const handleReset = () => {
    reset()
    setHandle("")
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && handle.trim() && status !== "fetching" && status !== "scoring") {
      handleAnalyze()
    }
  }

  const isLoading = status === "fetching" || status === "scoring"
  const hasResult = status === "complete" && analysis

  return (
    <section id="twitter-analyzer" className="py-24 bg-background">
      <div className="max-w-[960px] mx-auto px-4 sm:px-6">
        <AnimatedSection className="text-center mb-12">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-3">
            Go Deeper
          </p>
          <h2 className="font-heading text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Score Your Whole Account
          </h2>
          <p className="font-body text-muted-foreground max-w-[520px] mx-auto">
            Enter any Twitter handle. We&apos;ll pull their recent tweets, run each one through
            the AI Judge, and build a complete contribution profile.
          </p>
        </AnimatedSection>

        <div className="grid lg:grid-cols-2 gap-8 items-start">
          {/* Left — input panel */}
          <motion.div {...fadeInUp} className="space-y-5">
            {/* Handle input */}
            <div className="space-y-2">
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Twitter / X Handle
              </p>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-sm text-muted-foreground/50">
                    @
                  </span>
                  <input
                    type="text"
                    value={handle}
                    onChange={(e) => setHandle(e.target.value.replace(/\s/g, ""))}
                    onKeyDown={handleKeyDown}
                    placeholder="username"
                    maxLength={15}
                    className={cn(
                      "w-full rounded-[var(--radius)] border bg-transparent pl-8 pr-4 py-2.5",
                      "font-mono text-sm text-foreground placeholder:text-muted-foreground/40",
                      "transition-colors",
                      "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:ring-offset-background",
                      "border-border focus:border-primary/50"
                    )}
                  />
                </div>
                <ArcadeButton
                  size="md"
                  onClick={handleAnalyze}
                  loading={isLoading}
                  disabled={!handle.trim() || isLoading}
                  icon={!isLoading ? <Search size={14} /> : undefined}
                >
                  {isLoading ? "Analyzing…" : "Analyze"}
                </ArcadeButton>
              </div>
            </div>

            {/* How it works */}
            <div className="space-y-3 pt-2">
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                How it works
              </p>
              {[
                { step: "1", text: "We fetch up to 15 recent original tweets" },
                { step: "2", text: "Each tweet is scored by the AI Judge individually" },
                { step: "3", text: "You get an aggregate profile: genuine vs farming ratio, strengths, and areas to improve" },
              ].map((item) => (
                <div key={item.step} className="flex items-start gap-3">
                  <span className="font-display text-xs text-primary/60 mt-0.5">{item.step}</span>
                  <p className="font-body text-xs text-muted-foreground leading-relaxed">{item.text}</p>
                </div>
              ))}
            </div>

            {/* Live scoring progress */}
            <AnimatePresence>
              {isLoading && tweetScores.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="rounded-[var(--radius)] border border-primary/30 bg-primary/5 p-4 space-y-2 overflow-hidden"
                >
                  <p className="font-mono text-[10px] uppercase tracking-widest text-primary">
                    Live Scoring — {tweetScores.length}/{tweetsFetched}
                  </p>
                  <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                    {tweetScores.map((ts) => {
                      const flagConfig = FARMING_FLAGS[ts.farmingFlag]
                      return (
                        <motion.div
                          key={ts.tweetId}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="flex items-center gap-2"
                        >
                          <span
                            className="font-mono text-xs tabular w-6 text-right shrink-0"
                            style={{ color: flagConfig.color }}
                          >
                            {ts.compositeScore}
                          </span>
                          <div className="flex-1 h-1.5 rounded bg-secondary overflow-hidden">
                            <motion.div
                              className="h-full bg-primary rounded"
                              initial={{ width: 0 }}
                              animate={{ width: `${ts.compositeScore}%` }}
                              transition={{ duration: 0.3 }}
                            />
                          </div>
                          <span
                            className="w-1.5 h-1.5 rounded-full shrink-0"
                            style={{ backgroundColor: flagConfig.color }}
                          />
                        </motion.div>
                      )
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Right — result card or placeholder */}
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
                  <AccountScoreCard
                    analysis={analysis}
                    showReset
                    onReset={handleReset}
                  />
                </motion.div>
              ) : isLoading ? (
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
                    <p className="font-mono text-xs text-primary">
                      {statusMessage ?? "Analyzing…"}
                    </p>
                    {tweetsFetched > 0 && (
                      <p className="font-body text-xs text-muted-foreground">
                        {tweetScores.length} of {tweetsFetched} tweets scored
                      </p>
                    )}
                  </div>
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
                        <Twitter size={20} className="text-primary/60" />
                      </div>
                      <p className="font-body text-sm text-muted-foreground">
                        Enter a Twitter handle and hit{" "}
                        <span className="text-primary">Analyze</span> to see their full
                        contribution profile.
                      </p>
                      <p className="font-mono text-[10px] text-muted-foreground/40">
                        Works with any public account
                      </p>
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
