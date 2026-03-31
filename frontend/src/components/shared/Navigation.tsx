"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { Menu, X } from "lucide-react"
import { Logo } from "@/components/shared/Logo"
import { ArcadeButton } from "@/components/themed/ArcadeButton"
import { cn } from "@/lib/utils"
import { mobileNavSlide } from "@/styles/theme"

const NAV_LINKS = [
  { label: "Score Tweet",   href: "/#ai-judge-demo" },
  { label: "Score Account", href: "/#twitter-analyzer" },
  { label: "Features",      href: "/#features" },
  { label: "Pricing",       href: "/pricing" },
  { label: "FAQ",            href: "/#faq" },
]

export function Navigation() {
  const [scrolled, setScrolled]   = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 10)
    window.addEventListener("scroll", handler, { passive: true })
    return () => window.removeEventListener("scroll", handler)
  }, [])

  // Close mobile nav on resize to desktop
  useEffect(() => {
    const handler = () => { if (window.innerWidth >= 768) setMobileOpen(false) }
    window.addEventListener("resize", handler)
    return () => window.removeEventListener("resize", handler)
  }, [])

  return (
    <>
      <header
        className={cn(
          "fixed top-0 left-0 right-0 z-50 h-16",
          "transition-all duration-300",
          scrolled
            ? "bg-background/90 backdrop-blur-md border-b border-border"
            : "bg-transparent"
        )}
      >
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 h-full flex items-center justify-between">
          {/* Logo */}
          <Logo size="sm" />

          {/* Desktop links */}
          <nav className="hidden md:flex items-center gap-6">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="font-body text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* CTA */}
          <div className="hidden md:flex items-center gap-3">
            <Link href="/donate" className="font-body text-sm text-muted-foreground hover:text-foreground transition-colors">
              Donate
            </Link>
            <Link href="/login" className="font-body text-sm text-muted-foreground hover:text-foreground transition-colors">
              Login
            </Link>
            <ArcadeButton
              size="sm"
              variant="secondary"
              onClick={() => document.getElementById("waitlist")?.scrollIntoView({ behavior: "smooth" })}
            >
              Join Waitlist
            </ArcadeButton>
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu size={20} />
          </button>
        </div>
      </header>

      {/* Mobile nav overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm md:hidden"
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              {...mobileNavSlide}
              className="fixed top-0 right-0 bottom-0 z-50 w-72 bg-card border-l border-border p-6 md:hidden"
            >
              <div className="flex items-center justify-between mb-8">
                <Logo size="sm" />
                <button
                  onClick={() => setMobileOpen(false)}
                  className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Close menu"
                >
                  <X size={20} />
                </button>
              </div>

              <nav className="flex flex-col gap-1">
                {NAV_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className="py-3 px-2 font-body text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-sm transition-colors"
                  >
                    {link.label}
                  </Link>
                ))}
                <Link
                  href="/donate"
                  onClick={() => setMobileOpen(false)}
                  className="py-3 px-2 font-body text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-sm transition-colors"
                >
                  Donate
                </Link>
                <Link
                  href="/login"
                  onClick={() => setMobileOpen(false)}
                  className="py-3 px-2 font-body text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded-sm transition-colors"
                >
                  Login
                </Link>
              </nav>

              <div className="mt-6">
                <ArcadeButton
                  size="md"
                  className="w-full"
                  onClick={() => {
                    setMobileOpen(false)
                    setTimeout(() => document.getElementById("waitlist")?.scrollIntoView({ behavior: "smooth" }), 100)
                  }}
                >
                  Join Waitlist
                </ArcadeButton>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
