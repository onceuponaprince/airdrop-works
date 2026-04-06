"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { motion } from "framer-motion"
import { Twitter, CheckCircle, AlertCircle, Loader2 } from "lucide-react"
import { ArcadeButton } from "@/components/themed/ArcadeButton"
import { ArcadeCard } from "@/components/themed/ArcadeCard"
import { ScoreReveal } from "@/components/marketing/ScoreReveal"
import { useTwitterAnalyze } from "@/hooks/useTwitterAnalyze"
import type { AccountAnalysis } from "@/types/api"

interface StepTwitterProps {
  onComplete: (handle: string, accessToken: string, scoreData?: AccountAnalysis) => void
  onSkip: () => void
  onBack?: () => void
}

const ERROR_MESSAGES: Record<string, string> = {
  twitter_denied: "You denied access. Try again or skip this step.",
  twitter_auth_failed: "Authentication failed. Please try again.",
  twitter_token_failed: "Token exchange failed. Please try again.",
  twitter_no_token: "No token received. Please try again.",
  twitter_user_failed: "Could not fetch your Twitter profile.",
  twitter_no_handle: "Could not read your Twitter handle.",
  twitter_error: "Something went wrong. Please try again.",
  popup_blocked: "Popup was blocked. Allow popups for this site and try again.",
}

/**
 * Twitter connect + score step.
 *
 * Flow:
 *   1. User clicks "Connect Twitter" → popup opens for OAuth
 *   2. After connect → scoring starts automatically via /api/twitter-analyze
 *   3. Live progress shown as tweets are scored
 *   4. ScoreReveal renders with radar chart, bar chart, composite score
 *   5. User clicks "Continue" to advance with score data attached
 */
export function StepTwitter({ onComplete, onSkip, onBack }: StepTwitterProps) {
  const [connected, setConnected] = useState<{ handle: string; token: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [waiting, setWaiting] = useState(false)

  // Scoring state — reuses the existing useTwitterAnalyze hook
  const twitter = useTwitterAnalyze()
  const scoringStarted = useRef(false)

  // Listen for postMessage from the OAuth popup
  const handleMessage = useCallback((event: MessageEvent) => {
    const data = event.data
    if (data?.type !== "twitter_oauth_result") return

    setWaiting(false)

    if (data.error) {
      setError(ERROR_MESSAGES[data.error] || ERROR_MESSAGES.twitter_error)
    } else if (data.handle) {
      setConnected({ handle: data.handle, token: data.token ?? "" })
    }
  }, [])

  useEffect(() => {
    window.addEventListener("message", handleMessage)
    return () => window.removeEventListener("message", handleMessage)
  }, [handleMessage])

  // Auto-start scoring when Twitter is connected
  useEffect(() => {
    if (connected && !scoringStarted.current && twitter.status === "idle") {
      scoringStarted.current = true
      twitter.analyze(connected.handle)
    }
  }, [connected, twitter])

  const openTwitterPopup = () => {
    setError(null)
    setWaiting(true)

    const width = 600
    const height = 700
    const left = window.screenX + (window.outerWidth - width) / 2
    const top = window.screenY + (window.outerHeight - height) / 2

    const popup = window.open(
      "/api/auth/twitter",
      "twitter_oauth",
      `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes`
    )

    if (!popup) {
      setError(ERROR_MESSAGES.popup_blocked)
      setWaiting(false)
      return
    }

    const pollTimer = setInterval(() => {
      if (popup.closed) {
        clearInterval(pollTimer)
        setWaiting(false)
      }
    }, 500)
  }

  // ── Scoring complete — show ScoreReveal + Continue ──────────────────────
  if (connected && twitter.status === "complete" && twitter.accountResult) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <CheckCircle size={16} className="text-primary" />
          <span className="font-mono text-xs text-primary">@{connected.handle}</span>
        </div>

        <ScoreReveal analysis={twitter.accountResult} tweets={twitter.tweets} />

        <ArcadeButton
          size="lg"
          className="w-full"
          onClick={() => onComplete(connected.handle, connected.token, twitter.accountResult ?? undefined)}
        >
          Continue →
        </ArcadeButton>
      </div>
    )
  }

  // ── Scoring in progress — show live progress ──────────────────────────
  if (connected && (twitter.status === "fetching" || twitter.status === "scoring")) {
    return (
      <ArcadeCard className="space-y-4">
        <div className="flex items-center gap-2">
          <CheckCircle size={16} className="text-primary" />
          <span className="font-mono text-xs text-primary">@{connected.handle}</span>
        </div>

        <div className="flex items-center gap-3">
          <Loader2 size={18} className="text-primary animate-spin" />
          <div>
            <p className="font-body text-sm text-foreground">
              {twitter.status === "fetching"
                ? "Fetching your tweets..."
                : `Scoring ${twitter.tweets.length}/${twitter.tweetCount} tweets...`}
            </p>
            <p className="font-mono text-[10px] text-muted-foreground">
              AI Judge is reading your contributions
            </p>
          </div>
        </div>

        {/* Live tweet scores as they arrive */}
        {twitter.tweets.length > 0 && (
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {twitter.tweets.map((t) => (
              <motion.div
                key={t.tweetId}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-2 text-xs py-1"
              >
                <span className="font-mono text-primary w-6 text-right shrink-0">
                  {t.compositeScore}
                </span>
                <div className="flex-1 h-1.5 rounded bg-secondary overflow-hidden">
                  <motion.div
                    className="h-full bg-primary rounded"
                    initial={{ width: 0 }}
                    animate={{ width: `${t.compositeScore}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                <span className="text-muted-foreground truncate max-w-[180px]">
                  {t.text}
                </span>
              </motion.div>
            ))}
          </div>
        )}
      </ArcadeCard>
    )
  }

  // ── Scoring error — allow retry or skip ──────────────────────────────
  if (connected && twitter.status === "error") {
    return (
      <ArcadeCard className="space-y-4">
        <div className="flex items-center gap-2">
          <CheckCircle size={16} className="text-primary" />
          <span className="font-mono text-xs text-primary">@{connected.handle}</span>
        </div>
        <div className="flex items-start gap-2 rounded-sm border border-destructive/30 bg-destructive/5 px-3 py-2">
          <AlertCircle size={14} className="text-destructive shrink-0 mt-0.5" />
          <p className="font-body text-xs text-destructive">
            {twitter.error || "Scoring failed. You can continue without a score."}
          </p>
        </div>
        <div className="flex gap-2">
          <ArcadeButton
            size="md"
            className="flex-1"
            onClick={() => { twitter.reset(); scoringStarted.current = false }}
          >
            Retry
          </ArcadeButton>
          <ArcadeButton
            size="md"
            variant="secondary"
            className="flex-1"
            onClick={() => onComplete(connected.handle, connected.token)}
          >
            Continue without score
          </ArcadeButton>
        </div>
      </ArcadeCard>
    )
  }

  // ── Default state — connect or skip ──────────────────────────────────
  return (
    <ArcadeCard className="space-y-4">
      <p className="font-body text-sm text-muted-foreground">
        Connect Twitter to get a live AI Judge teaser score based on your recent tweets.
        This is what determines your contribution tier at launch.
      </p>

      {error && (
        <div className="flex items-start gap-2 rounded-sm border border-destructive/30 bg-destructive/5 px-3 py-2">
          <AlertCircle size={14} className="text-destructive shrink-0 mt-0.5" />
          <p className="font-body text-xs text-destructive">{error}</p>
        </div>
      )}

      <ArcadeButton
        size="lg"
        className="w-full"
        loading={waiting}
        onClick={openTwitterPopup}
        disabled={waiting}
      >
        <Twitter size={16} className="mr-2" />
        {waiting ? "Waiting for Twitter..." : "Connect Twitter"}
      </ArcadeButton>

      <div className="flex items-center justify-between">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="font-mono text-[10px] text-muted-foreground/50 hover:text-muted-foreground
                       transition-colors uppercase tracking-widest"
          >
            ← Back
          </button>
        ) : <span />}
        <button
          type="button"
          onClick={onSkip}
          className="font-mono text-[10px] text-muted-foreground/50 hover:text-muted-foreground
                     transition-colors uppercase tracking-widest"
        >
          Skip →
        </button>
      </div>

      <p className="font-mono text-[10px] text-muted-foreground/30 text-center">
        Read-only access · tweet.read + users.read only
      </p>
    </ArcadeCard>
  )
}
