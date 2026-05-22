"use client"

import Link from "next/link"
import { Shield, FileSpreadsheet, Users, Layers } from "lucide-react"
import { AnimatedSection } from "@/components/shared/AnimatedSection"
import { ArcadeButton } from "@/components/themed/ArcadeButton"
import { ArcadeCard } from "@/components/themed/ArcadeCard"

const DELIVERABLES = [
  {
    icon: Shield,
    title: "Farming detection",
    description:
      "Per-post genuine / farming / ambiguous flags with short explanations — not a black-box wallet score.",
  },
  {
    icon: Users,
    title: "Account rollups",
    description:
      "Batch-score recent posts; farming percentage and verdict for allocation review.",
  },
  {
    icon: Layers,
    title: "Quality dimensions",
    description:
      "Teaching value, originality, and community impact on a transparent rubric.",
  },
  {
    icon: FileSpreadsheet,
    title: "Export for allocators",
    description:
      "CSV of ranked contributors and flags for your snapshot or grant committee (pilot tier).",
  },
] as const

export function CampaignIntegritySection() {
  const scrollToDemo = () =>
    document.getElementById("ai-judge-demo")?.scrollIntoView({ behavior: "smooth" })

  return (
    <section
      id="campaign-integrity-pilot"
      className="py-24 border-y border-border bg-background"
    >
      <div className="max-w-[960px] mx-auto px-4 sm:px-6">
        <AnimatedSection className="text-center mb-12">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-3">
            For protocols &amp; growth teams
          </p>
          <h2 className="font-heading text-3xl sm:text-4xl font-bold text-foreground mb-4">
            Campaign Integrity Pilot
          </h2>
          <p className="font-body text-muted-foreground max-w-[620px] mx-auto leading-relaxed">
            Human Passport answers <em>who</em> is human. AI(r)Drop answers{" "}
            <em>what they contributed</em> and whether it deserves reward. Run a
            pilot on your campaign data before the snapshot — not after the
            backlash.
          </p>
        </AnimatedSection>

        <div className="grid sm:grid-cols-2 gap-4 mb-10">
          {DELIVERABLES.map((item, i) => (
            <AnimatedSection key={item.title} delay={i * 0.05}>
              <ArcadeCard className="h-full">
                <item.icon className="h-5 w-5 text-primary mb-3" aria-hidden />
                <h3 className="font-heading text-lg font-semibold text-foreground mb-2">
                  {item.title}
                </h3>
                <p className="font-body text-sm text-muted-foreground leading-relaxed">
                  {item.description}
                </p>
              </ArcadeCard>
            </AnimatedSection>
          ))}
        </div>

        <AnimatedSection>
          <ArcadeCard glow className="text-center space-y-4">
            <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Typical pilot
            </p>
            <p className="font-body text-foreground max-w-[540px] mx-auto">
              Historical Twitter/X batch for up to hundreds of handles, farming
              report, top genuine contributors, and exportable recommendations for
              your allocation team.
            </p>
            <div className="flex flex-wrap justify-center gap-3 pt-2">
              <ArcadeButton size="lg" onClick={scrollToDemo}>
                Try the live demo
              </ArcadeButton>
              <ArcadeButton
                size="lg"
                variant="secondary"
                onClick={() =>
                  document.getElementById("waitlist")?.scrollIntoView({
                    behavior: "smooth",
                  })
                }
              >
                Request a pilot
              </ArcadeButton>
              <Link
                href="/pricing"
                className="font-mono text-sm text-muted-foreground hover:text-foreground underline underline-offset-4 self-center"
              >
                View pricing
              </Link>
            </div>
            <p className="font-mono text-[10px] text-muted-foreground/70">
              One-pager for your team:{" "}
              <a
                href="https://github.com/onceuponaprince/airdrop-works/blob/main/docs/campaign-integrity-pilot.md"
                className="text-primary underline underline-offset-2 hover:text-primary/80"
                target="_blank"
                rel="noopener noreferrer"
              >
                docs/campaign-integrity-pilot.md
              </a>
            </p>
          </ArcadeCard>
        </AnimatedSection>
      </div>
    </section>
  )
}
