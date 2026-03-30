import Link from "next/link"
import { Logo } from "@/components/shared/Logo"

const FOOTER_LINKS = {
  Product: [
    { label: "Features",      href: "/#features" },
    { label: "AI Judge Demo", href: "/#ai-judge-demo" },
    { label: "Pricing",       href: "/pricing" },
    { label: "Roadmap",       href: "/#roadmap" },
    { label: "Donate",        href: "/donate" },
    { label: "Docs",          href: "#",            soon: true },
  ],
  Community: [
    { label: "Twitter/X",  href: "https://twitter.com/yuaboratory", external: true },
    { label: "Discord",    href: "#",  soon: true },
    { label: "Telegram",   href: "#",  soon: true },
  ],
  Legal: [
    { label: "Privacy Policy",   href: "/privacy" },
    { label: "Terms of Service", href: "/terms" },
    { label: "Data Processing Addendum", href: "/legal/dpa" },
  ],
}

export function Footer() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Logo size="sm" className="mb-3 block" />
            <p className="text-xs text-muted-foreground leading-relaxed max-w-[200px]">
              Airdrops reward the wrong people. We fixed that.
            </p>
          </div>

          {/* Link columns */}
          {Object.entries(FOOTER_LINKS).map(([group, links]) => (
            <div key={group}>
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-3">
                {group}
              </p>
              <ul className="space-y-2">
                {links.map((link) => (
                  <li key={link.label}>
                    {"soon" in link && link.soon ? (
                      <span className="text-xs text-muted-foreground/40 flex items-center gap-1.5">
                        {link.label}
                        <span className="text-[9px] font-mono bg-secondary text-muted-foreground px-1 rounded-sm">
                          soon
                        </span>
                      </span>
                    ) : (
                      <Link
                        href={link.href}
                        target={"external" in link && link.external ? "_blank" : undefined}
                        rel={"external" in link && link.external ? "noopener noreferrer" : undefined}
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            © 2026 Yurika. All rights reserved.
          </p>
          <p className="text-xs text-muted-foreground">
            Built by{" "}
            <Link
              href="https://yurika.space"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent/70 hover:text-accent transition-colors"
            >
              Yurika
            </Link>
            . Powered by AI that reads.
          </p>
        </div>
      </div>
    </footer>
  )
}
