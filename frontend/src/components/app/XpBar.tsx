"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { xpBarFill } from "@/styles/theme"
import type { Branch } from "@/lib/constants"

const branchColors: Record<Branch, string> = {
  educator: "#10B981",
  builder:  "#3B82F6",
  creator:  "#EC4899",
  scout:    "#06B6D4",
  diplomat: "#F59E0B",
}

interface XpBarProps {
  current: number
  max: number
  branch?: Branch
  showLabel?: boolean
  className?: string
  size?: "sm" | "md"
}

export function XpBar({
  current,
  max,
  branch,
  showLabel = false,
  className,
  size = "md",
}: XpBarProps) {
  const percentage = Math.min(100, Math.round((current / max) * 100))
  const color = branch ? branchColors[branch] : "#10B981"

  return (
    <div className={cn("w-full", className)}>
      {showLabel && (
        <div className="flex justify-between mb-1">
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            XP
          </span>
          <span className="font-mono text-[10px] text-muted-foreground tabular">
            {current.toLocaleString()} / {max.toLocaleString()}
          </span>
        </div>
      )}
      <div
        className={cn(
          "w-full rounded-sm bg-secondary overflow-hidden",
          size === "sm" ? "h-1.5" : "h-2.5"
        )}
      >
        <motion.div
          className="h-full rounded-sm"
          style={{ backgroundColor: color }}
          {...xpBarFill(percentage)}
        />
      </div>
    </div>
  )
}
