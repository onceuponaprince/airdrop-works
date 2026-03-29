import { AnimatedSection } from "@/components/shared/AnimatedSection"
import { CrtOverlay } from "@/components/themed/CrtOverlay"
import { WaitlistForm } from "@/components/marketing/WaitlistForm"

export function CTASection() {
  return (
    <section id="waitlist" className="py-24 relative overflow-hidden">
      {/* Ambient glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 50% 60%, hsl(160 80% 40% / 0.10) 0%, hsl(271 91% 65% / 0.06) 50%, transparent 80%)",
        }}
      />
      <CrtOverlay className="absolute inset-0 pointer-events-none" />

      <div className="relative z-10 max-w-[720px] mx-auto px-4 sm:px-6">
        <AnimatedSection className="text-center mb-12">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-3">
            Get in Early
          </p>
          <h2 className="font-heading text-3xl sm:text-4xl font-bold text-foreground mb-4">
            The Leaderboard Is Empty.{" "}
            <span className="text-primary glow-green">Your Name Goes First.</span>
          </h2>
          <p className="font-body text-muted-foreground max-w-[480px] mx-auto">
            Join the waitlist. Connect your wallet. When scoring goes live, you&apos;ll have a head start.
          </p>
        </AnimatedSection>

        <AnimatedSection>
          <WaitlistForm />
        </AnimatedSection>
      </div>
    </section>
  )
}
