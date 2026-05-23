"use client"

import { Wifi, Brain, TrendingUp, Gift } from "lucide-react"
import { AnimatedSection, StaggerItem } from "@/components/shared/AnimatedSection"
import { SectionHeader } from "@/components/marketing/SectionHeader"
import { ArcadeCard } from "@/components/themed/ArcadeCard"
import { BRANCHES } from "@/lib/constants"

const STEPS = [
  {
    number: "01",
    icon: Wifi,
    title: "Connect Your Accounts",
    body: "Link your Twitter, Discord, Telegram, or GitHub via OAuth. AI(r)Drop's crawlers find your contributions automatically. No copy-pasting. No manual submission. You do what you already do — the AI Judge watches.",
    color: BRANCHES.educator.color,
  },
  {
    number: "02",
    icon: Brain,
    title: "The AI Judge Scores Everything",
    body: "Every contribution is evaluated on Teaching Value, Originality, and Community Impact. The Judge uses contextual AI — it understands nuance, detects farming patterns, and distinguishes a genuine explainer from a rephrased press release.",
    color: BRANCHES.creator.color,
  },
  {
    number: "03",
    icon: TrendingUp,
    title: "Earn XP and Level Up",
    body: "Scores convert to XP across five skill branches: Educator, Builder, Creator, Scout, Diplomat. Unlock nodes in your skill tree. Climb the leaderboard. Accept quests from projects that need your specific expertise.",
    color: BRANCHES.scout.color,
  },
  {
    number: "04",
    icon: Gift,
    title: "Get Rewarded — For Real",
    body: "Projects distribute airdrops through AI(r)Drop's smart contracts. Rewards go to real contributors, weighted by quality scores. Loot drops. Badge NFTs. InnovatorTokens. The people who actually build the community get what they deserve.",
    color: BRANCHES.diplomat.color,
  },
] as const

export function SolutionSection() {
  return (
    <section id="how-it-works" className="py-24 bg-card/20">
      <div className="max-w-[960px] mx-auto px-4 sm:px-6">
        <AnimatedSection className="mb-14">
          <SectionHeader
            overline="How AI(r)Drop Works"
            title={
              <>
                AI That Actually <span className="text-primary">Reads</span> Your Contributions
              </>
            }
          />
        </AnimatedSection>

        <AnimatedSection stagger className="relative">
          {/* Vertical connector line */}
          <div className="absolute left-[27px] sm:left-[35px] top-8 bottom-8 w-px bg-gradient-to-b from-primary/40 via-accent/20 to-transparent hidden sm:block" />

          <div className="space-y-6">
            {STEPS.map((step) => {
              const Icon = step.icon
              return (
                <StaggerItem key={step.number}>
                  <div className="flex gap-4 sm:gap-6">
                    {/* Step node */}
                    <div className="flex-shrink-0 flex flex-col items-center">
                      <div
                        className="w-14 h-14 rounded-sm border flex items-center justify-center flex-shrink-0 relative z-10"
                        style={{
                          borderColor: `${step.color}40`,
                          backgroundColor: `${step.color}10`,
                          boxShadow: `0 0 16px ${step.color}20`,
                        }}
                      >
                        <Icon size={22} style={{ color: step.color }} />
                      </div>
                    </div>

                    {/* Content */}
                    <ArcadeCard className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] text-muted-foreground/40">{step.number}</span>
                        <h3 className="font-heading text-base font-semibold text-foreground">{step.title}</h3>
                      </div>
                      <p className="font-body text-sm text-muted-foreground leading-relaxed">{step.body}</p>
                    </ArcadeCard>
                  </div>
                </StaggerItem>
              )
            })}
          </div>
        </AnimatedSection>
      </div>
    </section>
  )
}
