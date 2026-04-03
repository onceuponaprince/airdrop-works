"use client"

import { useState } from "react"
import { Twitter, CheckCircle, AlertCircle } from "lucide-react"
import { ArcadeButton } from "@/components/themed/ArcadeButton"
import { ArcadeCard } from "@/components/themed/ArcadeCard"

interface StepTwitterProps {
  onComplete: (handle: string, accessToken: string) => void
  onSkip: () => void
}

/**
 * Twitter connect step — initiates OAuth 2.0 PKCE flow via /api/auth/twitter.
 * After callback, the user lands back on the page with ?twitter_handle=...
 * and ?twitter_token=... in the URL, which this component reads on mount.
 */
const ERROR_MESSAGES: Record<string, string> = {
  twitter_denied: "You denied access. Try again or skip this step.",
  twitter_auth_failed: "Authentication failed. Please try again.",
  twitter_token_failed: "Token exchange failed. Please try again.",
  twitter_no_token: "No token received. Please try again.",
  twitter_user_failed: "Could not fetch your Twitter profile.",
  twitter_no_handle: "Could not read your Twitter handle.",
  twitter_error: "Something went wrong. Please try again.",
}

/** Read and consume Twitter OAuth callback params from the URL. */
function readOAuthParams(): {
  connected: { handle: string; token: string } | null
  error: string | null
} {
  if (typeof window === "undefined") return { connected: null, error: null }

  const params = new URLSearchParams(window.location.search)
  const handle = params.get("twitter_handle")
  const token = params.get("twitter_token")
  const twitterError = params.get("twitter_error")

  // Clean URL params so they don't persist on refresh
  if (handle || twitterError) {
    const url = new URL(window.location.href)
    url.searchParams.delete("twitter_handle")
    url.searchParams.delete("twitter_token")
    url.searchParams.delete("twitter_error")
    window.history.replaceState({}, "", url.pathname + url.hash)
  }

  if (twitterError) {
    return { connected: null, error: ERROR_MESSAGES[twitterError] || ERROR_MESSAGES.twitter_error }
  }
  if (handle && token) {
    return { connected: { handle, token }, error: null }
  }
  return { connected: null, error: null }
}

export function StepTwitter({ onComplete, onSkip }: StepTwitterProps) {
  // Read OAuth callback params once on mount (initializer runs client-side only)
  const [oauthResult] = useState(readOAuthParams)
  const [connected] = useState(oauthResult.connected)
  const [error] = useState(oauthResult.error)

  // Connected state — show handle and continue button
  if (connected) {
    return (
      <ArcadeCard className="space-y-4">
        <div className="flex items-center gap-3">
          <CheckCircle size={18} className="text-primary shrink-0" />
          <div>
            <p className="text-sm font-medium text-foreground">
              @{connected.handle} connected
            </p>
            <p className="text-xs text-muted-foreground">
              Ready to score your contributions.
            </p>
          </div>
        </div>
        <ArcadeButton
          size="lg"
          className="w-full"
          onClick={() => onComplete(connected.handle, connected.token)}
        >
          Continue →
        </ArcadeButton>
      </ArcadeCard>
    )
  }

  // Default state — connect or skip
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
        onClick={() => {
          window.location.href = "/api/auth/twitter"
        }}
      >
        <Twitter size={16} className="mr-2" />
        Connect Twitter
      </ArcadeButton>

      <button
        type="button"
        onClick={onSkip}
        className="w-full font-mono text-[10px] text-muted-foreground/40 hover:text-muted-foreground
                   transition-colors uppercase tracking-widest"
      >
        Skip — join without a score
      </button>

      <p className="font-mono text-[10px] text-muted-foreground/30 text-center">
        Read-only access · tweet.read + users.read only
      </p>
    </ArcadeCard>
  )
}
