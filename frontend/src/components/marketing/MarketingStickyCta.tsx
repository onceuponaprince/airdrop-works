"use client"

import { useEffect, useState } from "react"
import { ArcadeButton } from "@/components/themed/ArcadeButton"
import { MarketingAuthActions } from "@/components/marketing/MarketingAuthActions"
import { useWeb3Auth } from "@/hooks/useWeb3Auth"
import { cn } from "@/lib/utils"

/** Mobile sticky bar: Demo | Waitlist — hidden when waitlist is in view. */
export function MarketingStickyCta() {
  const [visible, setVisible] = useState(false)
  const [waitlistInView, setWaitlistInView] = useState(false)
  const { isAuthenticated } = useWeb3Auth()

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400)
    window.addEventListener("scroll", onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  useEffect(() => {
    const el = document.getElementById("waitlist")
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => setWaitlistInView(entry.isIntersecting),
      { threshold: 0.15 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const scrollTo = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" })

  if (!visible || waitlistInView) return null

  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 z-40 md:hidden",
        "border-t border-border bg-background/95 backdrop-blur-md px-4 py-3",
        "safe-area-pb"
      )}
    >
      <div className="flex gap-2 max-w-[480px] mx-auto items-center">
        <MarketingAuthActions layout="sticky" fullWidth />
        {!isAuthenticated && (
          <>
            <ArcadeButton
              size="sm"
              variant="secondary"
              className="flex-1"
              onClick={() => scrollTo("ai-judge-demo")}
            >
              Try Demo
            </ArcadeButton>
            <ArcadeButton size="sm" className="flex-1" onClick={() => scrollTo("waitlist")}>
              Join Waitlist
            </ArcadeButton>
          </>
        )}
      </div>
    </div>
  )
}
