"use client"

import { motion, type Variants } from "framer-motion"
import { ArcadeButton } from "@/components/themed/ArcadeButton"
import { CrtOverlay } from "@/components/themed/CrtOverlay"
import { staggerContainer, staggerItem } from "@/styles/theme"

export function HeroSection() {
  const scrollTo = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" })

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
      {/* Ambient background glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: "var(--gradient-hero)" }}
      />

      {/* CRT scanlines over full hero */}
      <CrtOverlay className="absolute inset-0 pointer-events-none" />

      {/* Grid dot pattern */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: "radial-gradient(circle, #10B981 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      <div className="relative z-10 max-w-[960px] mx-auto px-4 sm:px-6 text-center">
        <motion.div
          variants={staggerContainer as Variants}
          initial="initial"
          animate="animate"
          className="space-y-6"
        >
          {/* Overline */}
          <motion.p
            variants={staggerItem as Variants}
            className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground"
          >
            Airdrops Are Broken
          </motion.p>

          {/* Main headline */}
          <motion.h1
            variants={staggerItem as Variants}
            className="font-heading text-4xl sm:text-5xl md:text-6xl font-bold text-foreground leading-[1.1] tracking-tight"
          >
            Bots Get Rewarded.{" "}
            <span className="text-foreground/50">You Don&apos;t.</span>
            <br />
            <span className="text-primary glow-green">We Fixed That.</span>
          </motion.h1>

          {/* Sub-headline */}
          <motion.p
            variants={staggerItem as Variants}
            className="font-body text-base sm:text-lg text-muted-foreground max-w-[580px] mx-auto leading-relaxed"
          >
            AI(r)Drop&apos;s AI Judge scores contributions by what actually matters —
            teaching value, originality, and community impact. Not likes. Not
            volume. Not who has the most alts.
          </motion.p>

          {/* CTAs */}
          <motion.div
            variants={staggerItem as Variants}
            className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2"
          >
            <ArcadeButton
              size="lg"
              onClick={() => scrollTo("ai-judge-demo")}
            >
              Try the AI Judge
            </ArcadeButton>
            <ArcadeButton
              size="lg"
              variant="secondary"
              onClick={() => scrollTo("waitlist")}
            >
              Join the Waitlist
            </ArcadeButton>
          </motion.div>

          {/* Social proof microline */}
          <motion.p
            variants={staggerItem as Variants}
            className="font-mono text-xs text-muted-foreground/60"
          >
            Join the contributors who are done with broken airdrops.
          </motion.p>
        </motion.div>
      </div>

      {/* Scroll hint — peek of next section */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5, duration: 0.6 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5"
      >
        <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground/40">
          Scroll
        </span>
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
          className="w-px h-8 bg-gradient-to-b from-primary/40 to-transparent"
        />
      </motion.div>
    </section>
  )
}
