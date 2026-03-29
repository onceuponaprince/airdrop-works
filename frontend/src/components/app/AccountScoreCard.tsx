"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { useAnimatedCounter } from "@/hooks/useAnimatedCounter"
import { CrtOverlay } from "@/components/themed/CrtOverlay"
import { Share2, ChevronDown, ChevronUp, ExternalLink } from "lucide-react"
import { scoreReveal, screenShake } from "@/styles/theme"
import { SCORE_DIMENSIONS, FARMING_FLAGS } from "@/lib/constants"
import { buildAccountTwitterShareUrl } from "@/lib/shareScore"
import type { AccountAnalysis, TweetScore } from "@/types/api"

interface AccountScoreCardProps {
  analysis: AccountAnalysis
  className?: string
  showReset?: boolean
  onReset?: () => void
}

function DimensionBar({
  label,
  value,
  color,
  index,
}: {
  label: string
  value: number
  color: string
  index: number
}) {
  const displayValue = useAnimatedCounter(value, { delay: 400 + index * 150 })

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          {label}
        </span>
        <span className="font-mono text-sm font-medium tabular" style={{ color }}>
          {String(displayValue).padStart(2, "0")}
        </span>
      </div>
      <div className="h-2 rounded-sm bg-secondary overflow-hidden">
        <motion.div
          className="h-full rounded-sm"
          style={{ backgroundColor: color }}
          initial={{ width: "0%" }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1], delay: 0.3 + index * 0.15 }}
        />
      </div>
    </div>
  )
}

function TweetRow({ tweet, index }: { tweet: TweetScore; index: number }) {
  const flagConfig = FARMING_FLAGS[tweet.farmingFlag]

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 * index }}
      className="flex items-start gap-3 py-2.5 border-b border-border/50 last:border-0"
    >
      <span
        className="font-mono text-lg font-medium tabular shrink-0 w-8 text-right"
        style={{ color: flagConfig.color }}
      >
        {tweet.compositeScore}
      </span>
      <div className="flex-1 min-w-0">
        <p className="font-body text-xs text-foreground/80 line-clamp-2 leading-relaxed">
          {tweet.text}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <span
            className={cn(
              "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-[10px] font-mono uppercase",
              flagConfig.bgClass,
              flagConfig.textClass,
            )}
          >
            <span
              className="w-1 h-1 rounded-full flex-shrink-0"
              style={{ backgroundColor: flagConfig.color }}
            />
            {flagConfig.label}
          </span>
          <a
            href={tweet.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground/40 hover:text-primary transition-colors"
          >
            <ExternalLink size={10} />
          </a>
        </div>
      </div>
    </motion.div>
  )
}

export function AccountScoreCard({
  analysis,
  className,
  showReset,
  onReset,
}: AccountScoreCardProps) {
  const [showAllTweets, setShowAllTweets] = useState(false)
  const compositeDisplay = useAnimatedCounter(analysis.aggregate.overallScore, {
    duration: 1200,
    delay: 200,
  })

  const isFarming = analysis.aggregate.verdict === "farming"
  const verdictConfig = FARMING_FLAGS[analysis.aggregate.verdict]
  const sortedTweets = [...analysis.tweets].sort((a, b) => b.compositeScore - a.compositeScore)
  const visibleTweets = showAllTweets ? sortedTweets : sortedTweets.slice(0, 5)

  return (
    <motion.div
      {...(isFarming ? screenShake : scoreReveal)}
      className={cn("w-full max-w-[520px]", className)}
    >
      <CrtOverlay glow>
        <div
          className={cn(
            "rounded-[var(--radius)] border border-border overflow-hidden",
            "bg-[linear-gradient(135deg,hsl(233_18%_9%)_0%,hsl(217_33%_17%)_100%)]",
          )}
        >
          {/* Header — username + composite score */}
          <div className="flex items-start justify-between p-5 pb-4">
            <div className="flex items-center gap-3">
              {analysis.avatarUrl && (
                <img
                  src={analysis.avatarUrl}
                  alt={analysis.username}
                  className="w-10 h-10 rounded-full border border-border"
                />
              )}
              <div>
                <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-0.5">
                  Account Score
                </p>
                <p className="font-heading text-sm font-bold text-foreground">
                  @{analysis.username}
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="font-display text-4xl text-primary glow-green tabular leading-none">
                {String(compositeDisplay).padStart(2, "0")}
              </span>
              <span className="font-mono text-sm text-muted-foreground ml-1">/100</span>
            </div>
          </div>

          {/* Verdict badge + stats row */}
          <div className="px-5 pb-3 flex items-center gap-3 flex-wrap">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm border text-xs font-mono uppercase tracking-widest",
                verdictConfig.bgClass,
                verdictConfig.textClass,
                verdictConfig.borderClass,
              )}
            >
              <span
                className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: verdictConfig.color }}
              />
              {verdictConfig.label}
            </span>
            <span className="font-mono text-[10px] text-muted-foreground">
              {analysis.tweetCount} tweets analyzed
            </span>
            <span className="font-mono text-[10px] text-primary">
              {analysis.aggregate.genuinePercentage}% genuine
            </span>
          </div>

          <div className="h-px bg-border mx-5" />

          {/* Dimension averages */}
          <div className="p-5 space-y-4">
            {SCORE_DIMENSIONS.map((dim, i) => (
              <DimensionBar
                key={dim.key}
                label={dim.label}
                value={analysis.aggregate[dim.key]}
                color={dim.color}
                index={i}
              />
            ))}
          </div>

          {/* AI assessment */}
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            transition={{ delay: 1.0, duration: 0.3 }}
            className="px-5 pb-4"
          >
            <div className="rounded-sm border border-primary/20 bg-primary/5 p-3 space-y-2">
              <p className="font-mono text-[10px] uppercase tracking-widest text-primary">AI Assessment</p>
              <div className="space-y-1">
                <p className="font-body text-xs text-foreground/80 leading-relaxed">
                  <span className="text-primary font-medium">Strengths: </span>
                  {analysis.aggregate.strengths}
                </p>
                <p className="font-body text-xs text-foreground/80 leading-relaxed">
                  <span className="text-accent font-medium">Improve: </span>
                  {analysis.aggregate.weaknesses}
                </p>
              </div>
            </div>
          </motion.div>

          <div className="h-px bg-border mx-5" />

          {/* Tweet breakdown */}
          <div className="px-5 py-4">
            <div className="flex items-center justify-between mb-3">
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Tweet Breakdown
              </p>
              <p className="font-mono text-[10px] text-muted-foreground/60">
                sorted by score
              </p>
            </div>

            <div className="space-y-0">
              {visibleTweets.map((tweet, i) => (
                <TweetRow key={tweet.tweetId} tweet={tweet} index={i} />
              ))}
            </div>

            {sortedTweets.length > 5 && (
              <button
                onClick={() => setShowAllTweets(!showAllTweets)}
                className="flex items-center gap-1 mt-3 font-mono text-[10px] text-muted-foreground hover:text-foreground transition-colors mx-auto"
              >
                {showAllTweets ? (
                  <>Show less <ChevronUp size={12} /></>
                ) : (
                  <>Show all {sortedTweets.length} tweets <ChevronDown size={12} /></>
                )}
              </button>
            )}
          </div>

          {/* Actions */}
          <div className="px-5 pb-5 flex items-center gap-4">
            {showReset && onReset && (
              <button
                onClick={onReset}
                className="text-xs font-mono text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
              >
                Analyze another →
              </button>
            )}
            <button
              onClick={() => window.open(buildAccountTwitterShareUrl(analysis), '_blank', 'noopener')}
              className={cn(
                "ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-sm border text-xs font-mono uppercase tracking-widest transition-all",
                "border-primary/40 text-primary bg-primary/10 hover:bg-primary/20"
              )}
            >
              <Share2 size={12} />
              Share
            </button>
          </div>
        </div>
      </CrtOverlay>
    </motion.div>
  )
}
