"use client"

import { useState, useEffect } from "react"
import { AnimatedSection } from "@/components/shared/AnimatedSection"
import { SectionHeader } from "@/components/marketing/SectionHeader"
import { useAnimatedCounter } from "@/hooks/useAnimatedCounter"
import { ArcadeCard } from "@/components/themed/ArcadeCard"
import { ExternalLink } from "lucide-react"

function WaitlistCounter() {
  const [count, setCount] = useState(0)

  useEffect(() => {
    fetch("/api/waitlist/count")
      .then((res) => (res.ok ? res.json() : { count: 0 }))
      .then((data: { count?: number }) => setCount(typeof data.count === "number" ? data.count : 0))
      .catch(() => setCount(0))
  }, [])

  const display = useAnimatedCounter(count, { duration: 1400, delay: 300 })
  return (
    <span className="font-display text-4xl sm:text-5xl text-primary glow-green tabular">
      {display.toLocaleString()}
    </span>
  )
}

const CREDIBILITY = [
  {
    label: "Infrastructure",
    value: "Rewards on Base, Solana, and Avalanche — your chain, your choice",
  },
  {
    label: "AI Engine",
    value: "Same scoring model powering sori.page",
  },
  {
    label: "Team",
    value: "Built by Yurika — ~70K Web3 community on Twitter",
  },
]

export function SocialProofSection() {
  return (
    <section id="community" className="py-24">
      <div className="max-w-[960px] mx-auto px-4 sm:px-6">
        <AnimatedSection className="mb-12">
          <SectionHeader
            align="center"
            overline="The Movement"
            title={
              <>
                Built for the Contributors{" "}
                <span className="text-muted-foreground">Platforms Forgot</span>
              </>
            }
          />
        </AnimatedSection>

        <AnimatedSection>
          {/* Counter card */}
          <div className="relative max-w-[480px] mx-auto mb-10">
            <div className="absolute inset-0 bg-primary/5 blur-3xl rounded-full" />
            <ArcadeCard glow className="relative text-center py-10">
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-4">
                Waitlist Contributors
              </p>
              <WaitlistCounter />
              <p className="font-body text-xs text-muted-foreground mt-3">
                Early access opens in batches. Wallet-connected signups get priority.
              </p>
            </ArcadeCard>
          </div>

          {/* Credibility signals */}
          <div className="grid sm:grid-cols-3 gap-4 mb-8">
            {CREDIBILITY.map((c) => (
              <ArcadeCard key={c.label} className="space-y-1">
                <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  {c.label}
                </p>
                <p className="font-body text-sm text-foreground/80">{c.value}</p>
              </ArcadeCard>
            ))}
          </div>

          {/* Follow CTA */}
          <div className="text-center">
            <a
              href="https://twitter.com/yuaboratory"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 font-mono text-xs text-muted-foreground hover:text-primary transition-colors"
            >
              Follow the build: @yuaboratory
              <ExternalLink size={12} />
            </a>
          </div>
        </AnimatedSection>
      </div>
    </section>
  )
}
