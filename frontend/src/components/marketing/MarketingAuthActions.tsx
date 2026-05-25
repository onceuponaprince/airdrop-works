"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArcadeButton } from "@/components/themed/ArcadeButton"
import { useWeb3Auth } from "@/hooks/useWeb3Auth"
import { cn } from "@/lib/utils"

type MarketingAuthActionsProps = {
  /** nav: header row; sticky: mobile bar; inline: text link for hero/footer contexts */
  layout?: "nav" | "sticky" | "inline"
  fullWidth?: boolean
  className?: string
}

/**
 * Landing ↔ app bridge: show Log in when anonymous, Open App when JWT exists.
 * Folded into login feature (S5); works with wallet auth today, email/social later.
 */
export function MarketingAuthActions({
  layout = "nav",
  fullWidth = false,
  className,
}: MarketingAuthActionsProps) {
  const router = useRouter()
  const { isAuthenticated, loading } = useWeb3Auth()

  if (loading) {
    return null
  }

  if (isAuthenticated) {
    if (layout === "inline") {
      return (
        <Link
          href="/dashboard"
          className={cn(
            "font-mono text-xs text-primary hover:text-primary/80 transition-colors underline underline-offset-4",
            className,
          )}
        >
          Open app
        </Link>
      )
    }

    return (
      <ArcadeButton
        size={layout === "sticky" ? "sm" : "sm"}
        className={cn(fullWidth && "w-full", layout === "sticky" && "flex-1", className)}
        onClick={() => router.push("/dashboard")}
      >
        Open App
      </ArcadeButton>
    )
  }

  if (layout === "sticky") {
    return (
      <Link
        href="/login"
        className={cn(
          "font-body text-sm text-muted-foreground hover:text-foreground transition-colors text-center py-2",
          fullWidth && "flex-1",
          className,
        )}
      >
        Log in
      </Link>
    )
  }

  if (fullWidth) {
    return (
      <ArcadeButton
        size="md"
        variant="secondary"
        className={cn("w-full", className)}
        onClick={() => router.push("/login")}
      >
        Log in
      </ArcadeButton>
    )
  }

  if (layout === "inline") {
    return (
      <Link
        href="/login"
        className={cn(
          "font-mono text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4",
          className,
        )}
      >
        Log in
      </Link>
    )
  }

  return (
    <Link
      href="/login"
      className={cn(
        "font-body text-sm text-muted-foreground hover:text-foreground transition-colors",
        layout === "sticky" && "flex-1 text-center py-2",
        className,
      )}
    >
      Log in
    </Link>
  )
}
