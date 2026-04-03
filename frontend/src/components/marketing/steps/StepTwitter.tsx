"use client"

import { Twitter } from "lucide-react"
import { ArcadeButton } from "@/components/themed/ArcadeButton"
import { ArcadeCard } from "@/components/themed/ArcadeCard"

interface StepTwitterProps {
  onComplete: (handle: string) => void
  onSkip: () => void
}

/** Phase 3 placeholder — will be replaced with Twitter OAuth + pre-scoring. */
export function StepTwitter({ onSkip }: StepTwitterProps) {
  return (
    <ArcadeCard className="space-y-4">
      <p className="font-body text-sm text-muted-foreground">
        Connect Twitter to get a live AI Judge teaser score based on your recent tweets.
        This is what determines your contribution tier at launch.
      </p>
      <ArcadeButton size="lg" className="w-full" disabled>
        <Twitter size={16} className="mr-2" />
        Connect Twitter (Coming Soon)
      </ArcadeButton>
      <button
        type="button"
        onClick={onSkip}
        className="w-full font-mono text-[10px] text-muted-foreground/40 hover:text-muted-foreground transition-colors uppercase tracking-widest"
      >
        Skip — join without a score
      </button>
    </ArcadeCard>
  )
}
