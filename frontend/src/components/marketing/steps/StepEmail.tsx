"use client"

import { ArcadeButton } from "@/components/themed/ArcadeButton"
import { ArcadeCard } from "@/components/themed/ArcadeCard"

interface StepEmailProps {
  onComplete: (email: string) => void
}

/** Phase 2 placeholder — will be replaced with OTP email verification. */
export function StepEmail({ onComplete }: StepEmailProps) {
  return (
    <ArcadeCard className="space-y-4">
      <p className="font-body text-sm text-muted-foreground">
        Email verification is coming in the next update. For now, enter your email to continue.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          const form = e.target as HTMLFormElement
          const email = (form.elements.namedItem("email") as HTMLInputElement).value
          if (email) onComplete(email)
        }}
        className="space-y-3"
      >
        <input
          name="email"
          type="email"
          required
          placeholder="you@example.com"
          className="w-full px-4 py-2.5 rounded-sm border border-border bg-transparent text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-ring font-body"
        />
        <ArcadeButton type="submit" size="lg" className="w-full">
          Continue →
        </ArcadeButton>
      </form>
    </ArcadeCard>
  )
}
