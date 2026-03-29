import { cn } from "@/lib/utils"
import Link from "next/link"

interface LogoProps {
  className?: string
  href?: string
  size?: "sm" | "md" | "lg"
}

const sizeClasses = {
  sm: "text-xs",
  md: "text-sm",
  lg: "text-base",
}

export function Logo({ className, href = "/", size = "md" }: LogoProps) {
  const content = (
    <span
      className={cn(
        "font-display text-primary tracking-tight glow-green",
        sizeClasses[size],
        className
      )}
    >
      AI(r)DROP
    </span>
  )

  if (href) {
    return (
      <Link href={href} className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm">
        {content}
      </Link>
    )
  }

  return content
}
