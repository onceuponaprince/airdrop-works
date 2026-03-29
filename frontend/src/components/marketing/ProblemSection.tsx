"use client"

import { AnimatedSection, StaggerItem } from "@/components/shared/AnimatedSection"
import { ArcadeCard } from "@/components/themed/ArcadeCard"
import { XCircle } from "lucide-react"

const PLATFORMS = [
  {
    name: "Kaito",
    status: "Dead — Jan 2026",
    statusColor: "text-destructive",
    problem: "Scored engagement metrics — impressions, retweets, reach. Trivially gameable. AI bots flooded timelines. Spam killed it.",
    verdict: "SUNSET",
    verdictColor: "bg-destructive/10 text-destructive border-destructive/30",
  },
  {
    name: "Galxe",
    status: "Alive but hated",
    statusColor: "text-[#F59E0B]",
    problem: "Task checklists, not contribution scoring. Laggy, buggy, bot-infested. \"Like 3 tweets to earn 0.2 points.\" CT calls it a virus.",
    verdict: "BROKEN",
    verdictColor: "bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/30",
  },
]

export function ProblemSection() {
  return (
    <section id="problem" className="py-24">
      <div className="max-w-[960px] mx-auto px-4 sm:px-6">
        <AnimatedSection className="mb-14">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-3">
            The Problem
          </p>
          <h2 className="font-heading text-3xl sm:text-4xl font-bold text-foreground mb-8">
            Airdrop Platforms Reward{" "}
            <span className="text-destructive">the Wrong People</span>
          </h2>

          {/* The Maya story */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Genuine contributor */}
            <ArcadeCard branch="educator" className="space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-widest text-[#10B981] mb-1">Real Contributor</p>
                  <p className="font-heading text-sm font-semibold text-foreground">@maya_defi</p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-[10px] text-muted-foreground">4 hours of work</p>
                  <p className="font-mono text-2xl font-medium text-destructive">12 pts</p>
                </div>
              </div>
              <p className="font-body text-sm text-muted-foreground leading-relaxed">
                Writes a 15-tweet thread explaining how a DeFi protocol&apos;s liquidation engine works. Diagrams, edge cases, risk scenarios.
              </p>
              <div className="flex items-center gap-2">
                <XCircle size={14} className="text-destructive flex-shrink-0" />
                <span className="font-body text-xs text-destructive">Gets nothing from the airdrop</span>
              </div>
            </ArcadeCard>

            {/* Bot */}
            <ArcadeCard className="space-y-3 border-destructive/20">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-widest text-destructive mb-1">Bot Network</p>
                  <p className="font-heading text-sm font-semibold text-foreground">@farmbot_9283</p>
                </div>
                <div className="text-right">
                  <p className="font-mono text-[10px] text-muted-foreground">200 posts, 50 servers</p>
                  <p className="font-mono text-2xl font-medium text-destructive">340 pts</p>
                </div>
              </div>
              <p className="font-body text-sm text-muted-foreground leading-relaxed italic">
                &quot;GM wagmi let&apos;s go $TOKEN&quot; — posted 200 times across 50 Discord servers. Zero insight. Zero effort.
              </p>
              <div className="flex items-center gap-2">
                <div className="w-3.5 h-3.5 rounded-full bg-destructive/20 border border-destructive/40 flex-shrink-0" />
                <span className="font-body text-xs text-destructive">Claims the airdrop. Dumps day one.</span>
              </div>
            </ArcadeCard>
          </div>
        </AnimatedSection>

        {/* Platform verdicts */}
        <AnimatedSection stagger className="space-y-4">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
            Current Solutions &amp; Their Failures
          </p>
          {PLATFORMS.map((p) => (
            <StaggerItem key={p.name}>
              <ArcadeCard className="flex items-start gap-4 sm:gap-6">
                <div className="flex-shrink-0 w-20 sm:w-24 text-center pt-1">
                  <p className="font-heading text-base font-bold text-foreground">{p.name}</p>
                  <span className={`font-mono text-[9px] uppercase tracking-wide ${p.statusColor}`}>
                    {p.status}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-body text-sm text-muted-foreground leading-relaxed">{p.problem}</p>
                </div>
                <div className="flex-shrink-0">
                  <span className={`inline-flex px-2 py-0.5 rounded-sm border font-mono text-[10px] uppercase tracking-widest ${p.verdictColor}`}>
                    {p.verdict}
                  </span>
                </div>
              </ArcadeCard>
            </StaggerItem>
          ))}

          <StaggerItem>
            <ArcadeCard className="border-primary/20 bg-primary/5 text-center p-6">
              <p className="font-body text-sm text-muted-foreground">
                The fix is obvious:{" "}
                <span className="text-foreground font-medium">score quality, not volume.</span>{" "}
                Nobody has shipped this because it requires genuine AI capability — contextual understanding of whether a contribution teaches, builds, or creates real value.
              </p>
            </ArcadeCard>
          </StaggerItem>
        </AnimatedSection>
      </div>
    </section>
  )
}
