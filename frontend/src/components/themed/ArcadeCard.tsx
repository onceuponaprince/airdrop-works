"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { cardHover } from "@/styles/theme"
import type { HTMLAttributes } from "react"

type Branch = "educator" | "builder" | "creator" | "scout" | "diplomat"

interface ArcadeCardProps
  extends Omit<
    HTMLAttributes<HTMLDivElement>,
    "onAnimationStart" | "onAnimationEnd" | "onAnimationIteration"
  > {
  interactive?: boolean   // adds hover lift + glow
  branch?: Branch         // adds 2px left border in branch color
  glow?: boolean          // forces green screen-glow
  noPadding?: boolean
}

const branchBorderColors: Record<Branch, string> = {
  educator: "border-l-[#10B981]",
  builder:  "border-l-[#3B82F6]",
  creator:  "border-l-[#EC4899]",
  scout:    "border-l-[#06B6D4]",
  diplomat: "border-l-[#F59E0B]",
}

export function ArcadeCard({
  interactive = false,
  branch,
  glow = false,
  noPadding = false,
  className,
  children,
  ...props
}: ArcadeCardProps) {
  const classes = cn(
    "bg-card rounded-[var(--radius)] border border-border",
    "transition-all duration-200",
    !noPadding && "p-5",
    interactive && "cursor-pointer hover:border-primary hover:shadow-[0_0_16px_hsl(160_80%_40%/0.15)]",
    glow && "shadow-[inset_0_0_60px_hsl(160_80%_40%/0.05),_0_0_40px_hsl(160_80%_40%/0.08)]",
    branch && `border-l-2 ${branchBorderColors[branch]}`,
    className
  )

  if (interactive) {
    return (
      <motion.div
        whileHover={cardHover.whileHover}
        className={classes}
      >
        {children}
      </motion.div>
    )
  }

  return (
    <div
      className={classes}
      {...props}
    >
      {children}
    </div>
  )
}
