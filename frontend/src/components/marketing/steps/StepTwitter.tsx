"use client"

import { useState, useEffect, useCallback } from "react"
import { Twitter, CheckCircle, AlertCircle } from "lucide-react"
import { ArcadeButton } from "@/components/themed/ArcadeButton"
import { ArcadeCard } from "@/components/themed/ArcadeCard"

interface StepTwitterProps {
  onComplete: (handle: string, accessToken: string) => void
  onSkip: () => void
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
 * Twitter connect step — opens OAuth in a popup window.
 *
 * Flow:
 *   1. User clicks "Connect Twitter" → popup opens to /api/auth/twitter
 *   2. Popup redirects to Twitter authorization
 *   3. Twitter redirects back to /api/auth/twitter/callback (in the popup)
 *   4. Callback renders a small HTML page that posts the result via postMessage
 *   5. This component receives the message and closes the popup
 *
 * The main page never navigates away — quest chain state is preserved.
 */
export function StepTwitter({ onComplete, onSkip }: StepTwitterProps) {
  const [connected, setConnected] = useState<{ handle: string; token: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [waiting, setWaiting] = useState(false)

  // Listen for postMessage from the OAuth popup
  const handleMessage = useCallback((event: MessageEvent) => {
    // Accept the message if it has our expected type — the popup is ours
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

    // Poll to detect if user closed the popup without completing auth
    const pollTimer = setInterval(() => {
      if (popup.closed) {
        clearInterval(pollTimer)
        setWaiting(false)
      }
    }, 500)
  }

  // Connected state
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

  // Default state
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
