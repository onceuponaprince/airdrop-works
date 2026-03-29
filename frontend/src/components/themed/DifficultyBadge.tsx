import { cn } from "@/lib/utils"
import type { DifficultyRating } from "@/lib/constants"

interface DifficultyBadgeProps {
  rating: DifficultyRating
  className?: string
}

const ratingStyles: Record<DifficultyRating, string> = {
  D: "text-[#9CA3AF] border-[#9CA3AF]/40 bg-[#9CA3AF]/10",
  C: "text-primary border-primary/40 bg-primary/10",
  B: "text-[#3B82F6] border-[#3B82F6]/40 bg-[#3B82F6]/10",
  A: "text-accent border-accent/40 bg-accent/10",
  S: "text-[#F59E0B] border-[#F59E0B]/40 bg-[#F59E0B]/10 shadow-[0_0_8px_hsl(38_92%_50%/0.4)]",
}

export function DifficultyBadge({ rating, className }: DifficultyBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center w-7 h-7 rounded-sm border",
        "font-display text-xs",
        ratingStyles[rating],
        className
      )}
    >
      {rating}
    </span>
  )
}
