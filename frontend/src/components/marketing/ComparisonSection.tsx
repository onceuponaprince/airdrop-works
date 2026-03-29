"use client"

import { AnimatedSection } from "@/components/shared/AnimatedSection"
import { cn } from "@/lib/utils"

type CellValue = "yes" | "no" | "partial" | string

const ROWS = [
  { label: "Status",         kaito: "Dead (Jan 2026)",             galxe: "Alive but hated",     ours: "Launching now" },
  { label: "Scores by",      kaito: "Engagement metrics",          galxe: "Task completion",      ours: "AI quality analysis" },
  { label: "Bot problem",    kaito: "Killed the platform",         galxe: "Bots rank > humans",   ours: "Farming detection core" },
  { label: "UX",             kaito: "Clean, no longer relevant",   galxe: "Laggy & buggy",        ours: "Arcade RPG" },
  { label: "Rewards",        kaito: "Shrinking, $4 claim fees",    galxe: "$4–10 after months",   ours: "Loot drops + badge NFTs" },
  { label: "For projects",   kaito: "Studio (closed, selective)",  galxe: "Default but hated",    ours: "White-label + custom AI" },
]

function Cell({ value, isOurs }: { value: CellValue; isOurs?: boolean }) {
  return (
    <td
      className={cn(
        "px-4 py-3 text-xs font-body",
        isOurs ? "text-foreground font-medium" : "text-muted-foreground"
      )}
    >
      {value}
    </td>
  )
}

export function ComparisonSection() {
  return (
    <section id="comparison" className="py-24 bg-card/20">
      <div className="max-w-[960px] mx-auto px-4 sm:px-6">
        <AnimatedSection className="mb-14">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-3">
            Honest Comparison
          </p>
          <h2 className="font-heading text-3xl sm:text-4xl font-bold text-foreground">
            Why This Exists
          </h2>
        </AnimatedSection>

        <AnimatedSection>
          <div className="overflow-x-auto rounded-[var(--radius)] border border-border">
            <table className="w-full min-w-[560px]">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-widest text-muted-foreground w-[28%]">
                    Feature
                  </th>
                  <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-widest text-muted-foreground/40 w-[24%]">
                    Kaito
                    <span className="ml-2 text-[8px] bg-destructive/10 text-destructive border border-destructive/20 px-1 py-0.5 rounded-sm">RIP</span>
                  </th>
                  <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-widest text-muted-foreground/40 w-[24%]">
                    Galxe
                  </th>
                  <th className="px-4 py-3 text-left font-mono text-[10px] uppercase tracking-widest text-primary w-[24%]">
                    AI(r)Drop
                  </th>
                </tr>
              </thead>
              <tbody>
                {ROWS.map((row) => (
                  <tr
                    key={row.label}
                    className={cn(
                      "border-b border-border/50 last:border-0",
                      "hover:bg-secondary/20 transition-colors"
                    )}
                  >
                    <td className="px-4 py-3">
                      <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground/60">
                        {row.label}
                      </span>
                    </td>
                    <Cell value={row.kaito} />
                    <Cell value={row.galxe} />
                    <td className="px-4 py-3 border-l border-primary/10 bg-primary/[0.03]">
                      <span className="text-xs font-body font-medium text-foreground">{row.ours}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AnimatedSection>
      </div>
    </section>
  )
}
