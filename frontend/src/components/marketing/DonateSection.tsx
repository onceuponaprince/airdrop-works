import Link from "next/link"
import { Heart } from "lucide-react"
import { AnimatedSection } from "@/components/shared/AnimatedSection"
import { ArcadeButton } from "@/components/themed/ArcadeButton"

export function DonateSection() {
  return (
    <section id="donate" className="py-24 bg-background">
      <div className="max-w-[720px] mx-auto px-4 sm:px-6 text-center">
        <AnimatedSection className="space-y-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Support the Project
          </p>
          <h2 className="font-heading text-3xl sm:text-4xl font-bold text-foreground">
            Help Us Build a{" "}
            <span className="text-primary glow-green">Fairer Airdrop System</span>
          </h2>
          <p className="font-body text-muted-foreground max-w-[480px] mx-auto">
            AI(r)Drop is community-funded. Your donation helps us keep the AI Judge
            running, expand scoring to more chains, and ship faster.
          </p>
          <div className="pt-2">
            <Link href="/donate">
              <ArcadeButton size="lg" icon={<Heart size={16} />}>
                Donate Now
              </ArcadeButton>
            </Link>
          </div>
        </AnimatedSection>
      </div>
    </section>
  )
}
