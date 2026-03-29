import { cn } from "@/lib/utils"
import type { RarityTier } from "@/lib/constants"

interface RarityBadgeProps {
  tier: RarityTier
  className?: string
  size?: "sm" | "md"
}

const tierStyles: Record<RarityTier, { label: string; classes: string }> = {
  common:    { label: "Common",    classes: "text-[#9CA3AF] border-[#9CA3AF]/40 bg-[#9CA3AF]/10" },
  uncommon:  { label: "Uncommon",  classes: "text-primary border-primary/40 bg-primary/10" },
  rare:      { label: "Rare",      classes: "text-[#3B82F6] border-[#3B82F6]/40 bg-[#3B82F6]/10" },
  epic:      { label: "Epic",      classes: "text-accent border-accent/40 bg-accent/10" },
  legendary: { label: "Legendary", classes: "text-[#F59E0B] border-[#F59E0B]/40 bg-[#F59E0B]/10 shadow-[0_0_10px_hsl(38_92%_50%/0.3)]" },
}

export function RarityBadge({ tier, className, size = "sm" }: RarityBadgeProps) {
  const { label, classes } = tierStyles[tier]

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-sm border font-mono uppercase tracking-widest",
        size === "sm" ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-1 text-xs",
        classes,
        className
      )}
    >
      {label}
    </span>
  )
}
