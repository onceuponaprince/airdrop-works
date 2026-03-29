"use client"

/**
 * Presents a single `JudgeResult`: composite score, dimension bars, farming badge/explanation, optional reset and Twitter share.
 */

import { motion, AnimatePresence } from "framer-motion"
import { cn } from "@/lib/utils"
import { useAnimatedCounter } from "@/hooks/useAnimatedCounter"
import { CrtOverlay } from "@/components/themed/CrtOverlay"
import { Share2 } from "lucide-react"
import {
  scoreReveal,
  farmingBadge,
  screenShake,
} from "@/styles/theme"
import { SCORE_DIMENSIONS, FARMING_FLAGS } from "@/lib/constants"
import { buildTwitterShareUrl } from "@/lib/shareScore"
import type { JudgeResult } from "@/types/api"

interface ScoreCardProps {
  result: JudgeResult
  className?: string
  /** If true, shows a subtle "Try another" ghost button below */
  showReset?: boolean
  onReset?: () => void
  /** If true, shows a "Share your score" button below the card */
  showShare?: boolean
}

function ScoreDimensionBar({
  label,
  description,
  value,
  color,
  index,
}: {
  label: string
  description: string
  value: number
  color: string
  index: number
}) {
  const displayValue = useAnimatedCounter(value, { delay: 400 + index * 150 })

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
            {label}
          </p>
          <p className="text-xs text-muted-foreground/60 mt-0.5">{description}</p>
        </div>
        <span
          className="font-mono text-lg font-medium tabular"
          style={{ color }}
        >
          {String(displayValue).padStart(2, "0")}
        </span>
      </div>

      {/* Score bar track */}
      <div className="h-2.5 rounded-sm bg-secondary overflow-hidden">
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

function FarmingBadge({ flag }: { flag: JudgeResult["farmingFlag"] }) {
  const config = FARMING_FLAGS[flag]

  return (
    <motion.div {...farmingBadge}>
      <span
        className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm border text-xs font-mono uppercase tracking-widest",
          config.bgClass,
          config.textClass,
          config.borderClass
        )}
      >
        <span
          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: config.color }}
        />
        {config.label}
      </span>
    </motion.div>
  )
}

/** Arcade-styled CRT card with animated counters; shakes when `farmingFlag` is `farming`. */
export function ScoreCard({ result, className, showReset, onReset, showShare }: ScoreCardProps) {
  const compositeDisplay = useAnimatedCounter(result.compositeScore, {
    duration: 1200,
    delay: 200,
  })

  const isFarming = result.farmingFlag === "farming"

  return (
    <motion.div
      {...(isFarming ? screenShake : scoreReveal)}
      className={cn("w-full max-w-[480px]", className)}
    >
      <CrtOverlay glow>
        <div
          className={cn(
            "rounded-[var(--radius)] border border-border overflow-hidden",
            "bg-[linear-gradient(135deg,hsl(233_18%_9%)_0%,hsl(217_33%_17%)_100%)]",
          )}
        >
          {/* Header — composite score + farming badge */}
          <div className="flex items-start justify-between p-5 pb-4">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
                AI Judge Score
              </p>
              <div className="flex items-end gap-2">
                <span className="font-display text-4xl text-primary glow-green tabular leading-none">
                  {String(compositeDisplay).padStart(2, "0")}
                </span>
                <span className="font-mono text-sm text-muted-foreground mb-1">/100</span>
              </div>
            </div>

            <FarmingBadge flag={result.farmingFlag} />
          </div>

          {/* Divider */}
          <div className="h-px bg-border mx-5" />

          {/* Dimension scores */}
          <div className="p-5 space-y-5">
            {SCORE_DIMENSIONS.map((dim, i) => (
              <ScoreDimensionBar
                key={dim.key}
                label={dim.label}
                description={dim.description}
                value={result[dim.key]}
                color={dim.color}
                index={i}
              />
            ))}
          </div>

          {/* Farming explanation */}
          <AnimatePresence>
            {result.farmingExplanation && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                transition={{ delay: 1.2, duration: 0.3 }}
                className="px-5 pb-5"
              >
                <div
                  className={cn(
                    "rounded-sm border p-3 text-xs font-body leading-relaxed",
                    FARMING_FLAGS[result.farmingFlag].bgClass,
                    FARMING_FLAGS[result.farmingFlag].textClass,
                    FARMING_FLAGS[result.farmingFlag].borderClass,
                  )}
                >
                  {result.farmingExplanation}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Actions row */}
          {(showReset || showShare) && (
            <div className="px-5 pb-5 flex items-center gap-4">
              {showReset && onReset && (
                <button
                  onClick={onReset}
                  className="text-xs font-mono text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
                >
                  Score another →
                </button>
              )}
              {showShare && (
                <button
                  onClick={() => window.open(buildTwitterShareUrl(result), '_blank', 'noopener')}
                  className={cn(
                    "ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-sm border text-xs font-mono uppercase tracking-widest transition-all",
                    "border-primary/40 text-primary bg-primary/10 hover:bg-primary/20"
                  )}
                >
                  <Share2 size={12} />
                  Share
                </button>
              )}
            </div>
          )}
        </div>
      </CrtOverlay>
    </motion.div>
  )
}
