"use client"

import { Brain, GitBranch, ScrollText, Gift, Link2, Palette } from "lucide-react"
import { AnimatedSection, StaggerItem } from "@/components/shared/AnimatedSection"
import { SectionHeader } from "@/components/marketing/SectionHeader"
import { ArcadeCard } from "@/components/themed/ArcadeCard"
import { BRANCHES, SCORE_DIMENSIONS } from "@/lib/constants"

const FEATURES = [
  {
    icon: Brain,
    color: BRANCHES.educator.color,
    title: "Scores Quality, Not Likes",
    body: "Contextual AI that reads contributions for teaching value, originality, and impact. Detects engagement farming. Transparent scoring with per-dimension breakdowns. Configurable per campaign.",
  },
  {
    icon: GitBranch,
    color: BRANCHES.builder.color,
    title: "Five Paths to Mastery",
    body: "Educator. Builder. Creator. Scout. Diplomat. Every contribution earns XP in the branch it fits. Unlock nodes, gain multipliers, specialize in what you're best at. Inspired by Path of Exile.",
  },
  {
    icon: ScrollText,
    color: SCORE_DIMENSIONS[1].color,
    title: "Campaigns, Not Checklists",
    body: "Projects post contribution campaigns ranked by difficulty (D through S). Accept quests that match your skills. Form parties for bonus XP. Completion is judged by the AI — not whether you clicked a checkbox.",
  },
  {
    icon: Gift,
    color: BRANCHES.diplomat.color,
    title: "Rewards That Feel Like Rewards",
    body: "Loot drops with rarity tiers — Common through Legendary. Chest-opening animations. Badge NFTs for your permanent collection. InnovatorTokens redeemable via the prize wheel. Every score is a chance at something satisfying.",
  },
  {
    icon: Link2,
    color: BRANCHES.scout.color,
    title: "Avalanche. Base. Solana.",
    body: "Smart contracts deployed across EVM chains and Solana. Rewards distribute on your preferred chain. No bridging required. ProfileNFTs and badges are cross-chain portable.",
  },
  {
    icon: Palette,
    color: BRANCHES.creator.color,
    title: "Your Community, Your Rules",
    body: "Deploy your own AI(r)Drop instance. Custom scoring rubrics. Custom branding. Custom reward pools. The AI Judge infrastructure powers it all — you just decide what \"quality\" means for your community.",
  },
]

export function FeaturesSection() {
  return (
    <section id="features" className="py-24">
      <div className="max-w-[960px] mx-auto px-4 sm:px-6">
        <AnimatedSection className="mb-14">
          <SectionHeader overline="Built Different" title="Not Another Quest Platform" />
        </AnimatedSection>

        <AnimatedSection stagger>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f) => {
              const Icon = f.icon
              return (
                <StaggerItem key={f.title}>
                  <ArcadeCard
                    interactive
                    className="h-full space-y-3 group"
                  >
                    {/* Icon */}
                    <div
                      className="w-10 h-10 rounded-sm border flex items-center justify-center transition-all duration-200 group-hover:shadow-[0_0_12px_var(--icon-glow)]"
                      style={{
                        borderColor: `${f.color}30`,
                        backgroundColor: `${f.color}10`,
                        ["--icon-glow" as string]: `${f.color}40`,
                      }}
                    >
                      <Icon size={18} style={{ color: f.color }} />
                    </div>
                    {/* Text */}
                    <div className="space-y-1.5">
                      <h3 className="font-heading text-sm font-semibold text-foreground">{f.title}</h3>
                      <p className="font-body text-xs text-muted-foreground leading-relaxed">{f.body}</p>
                    </div>
                  </ArcadeCard>
                </StaggerItem>
              )
            })}
          </div>
        </AnimatedSection>
      </div>
    </section>
  )
}
