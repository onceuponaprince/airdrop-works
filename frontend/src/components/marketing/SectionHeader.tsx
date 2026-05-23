import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface SectionHeaderProps {
  overline: string
  title: ReactNode
  description?: ReactNode
  className?: string
  align?: "left" | "center"
}

/** Shared landing section header — matches Figma overline + heading rhythm. */
export function SectionHeader({
  overline,
  title,
  description,
  className,
  align = "left",
}: SectionHeaderProps) {
  return (
    <div className={cn(align === "center" && "text-center", className)}>
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-3">
        {overline}
      </p>
      <h2 className="font-heading text-3xl sm:text-4xl font-bold text-foreground">{title}</h2>
      {description ? (
        <p
          className={cn(
            "font-body text-muted-foreground mt-4 leading-relaxed",
            align === "center" && "mx-auto max-w-2xl"
          )}
        >
          {description}
        </p>
      ) : null}
    </div>
  )
}
