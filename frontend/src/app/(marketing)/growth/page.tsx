import type { Metadata } from "next"
import { MarketingJudgeDemo } from "@/components/marketing/MarketingJudgeDemo"

export const metadata: Metadata = {
  title: "Growth Judge — Score Ad Copy | AI(r)Drop",
  description:
    "Score marketing copy on hook, clarity, audience fit, CTA strength, and fatigue risk. Built on the same AI Judge engine.",
}

export default function GrowthPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <MarketingJudgeDemo />
    </main>
  )
}
