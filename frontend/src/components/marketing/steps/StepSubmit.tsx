"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { ArcadeButton } from "@/components/themed/ArcadeButton"
import { ArcadeCard } from "@/components/themed/ArcadeCard"
import { useWaitlist } from "@/hooks/useWaitlist"
import { useReferral } from "@/hooks/useReferral"
import { scoreReveal } from "@/styles/theme"

interface StepSubmitProps {
  walletAddress: string
  email: string
  twitterHandle?: string
  onSuccess?: () => void
}

export function StepSubmit({ walletAddress, email, twitterHandle, onSuccess: _onSuccess }: StepSubmitProps) {
  const { status, rank, referralUrl, alreadyExists, error, submit } = useWaitlist()
  const inboundReferralCode = useReferral()
  const [honeypot, setHoneypot] = useState("")
  const [copied, setCopied] = useState(false)

  const handleSubmit = () => {
    submit({
      email,
      walletAddress,
      referralCode: inboundReferralCode || undefined,
      honeypot: honeypot || undefined,
    })
  }

  const handleCopy = async () => {
    if (!referralUrl) return
    await navigator.clipboard.writeText(referralUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Success state
  if (status === "success" && rank) {
    return (
      <motion.div {...scoreReveal} className="space-y-4">
        <ArcadeCard glow className="py-8 space-y-4 text-center">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            {alreadyExists ? "Already on the list" : "Quest Complete"}
          </p>
          <div>
            <p className="font-mono text-xs text-muted-foreground mb-1">Waitlist Rank</p>
            <span className="font-display text-5xl text-primary glow-green">#{rank}</span>
          </div>
          <p className="font-body text-sm text-muted-foreground">
            {alreadyExists
              ? "You're already registered. Your rank has been updated."
              : "We'll ping you when scoring goes live. Check your email."}
          </p>
          <p className="font-mono text-[10px] text-primary">
            Wallet linked → beta access reserved.
          </p>
        </ArcadeCard>

        {referralUrl && (
          <ArcadeCard className="space-y-3">
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Move up the list
            </p>
            <p className="font-body text-xs text-muted-foreground">
              Each referral bumps you higher. Share your link:
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 font-mono text-xs text-primary bg-background rounded-sm border border-border px-3 py-2 truncate">
                {referralUrl}
              </code>
              <button
                onClick={handleCopy}
                className={cn(
                  "flex-shrink-0 px-3 py-2 rounded-sm border font-mono text-xs transition-all",
                  copied
                    ? "bg-primary/10 border-primary/40 text-primary"
                    : "bg-secondary border-border text-muted-foreground hover:text-foreground hover:border-primary/40"
                )}
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
          </ArcadeCard>
        )}
      </motion.div>
    )
  }

  // Pre-submit review
  return (
    <ArcadeCard className="space-y-4">
      <p className="font-body text-sm text-muted-foreground">
        Review your quest progress and claim your rank.
      </p>

      <div className="space-y-2 text-xs">
        <div className="flex justify-between items-center py-2 border-b border-border">
          <span className="font-mono text-muted-foreground uppercase tracking-widest">Wallet</span>
          <code className="font-mono text-primary">
            {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
          </code>
        </div>
        <div className="flex justify-between items-center py-2 border-b border-border">
          <span className="font-mono text-muted-foreground uppercase tracking-widest">Email</span>
          <span className="font-body text-foreground">{email}</span>
        </div>
        {twitterHandle && (
          <div className="flex justify-between items-center py-2 border-b border-border">
            <span className="font-mono text-muted-foreground uppercase tracking-widest">Twitter</span>
            <span className="font-body text-foreground">@{twitterHandle}</span>
          </div>
        )}
      </div>

      {error && (
        <p className="font-body text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-sm px-3 py-2">
          {error}
        </p>
      )}

      {/* Honeypot */}
      <div aria-hidden="true" style={{ position: "absolute", left: "-9999px", opacity: 0, height: 0, overflow: "hidden" }}>
        <input
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
        />
      </div>

      <ArcadeButton
        size="lg"
        className="w-full"
        loading={status === "submitting"}
        onClick={handleSubmit}
      >
        Claim Your Score →
      </ArcadeButton>
    </ArcadeCard>
  )
}
