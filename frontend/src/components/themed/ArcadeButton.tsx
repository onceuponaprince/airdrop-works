"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { buttonPress } from "@/styles/theme"
import { Loader2 } from "lucide-react"
import type { ButtonHTMLAttributes } from "react"

type Variant = "primary" | "secondary" | "ghost" | "destructive" | "legendary"
type Size    = "sm" | "md" | "lg"

interface ArcadeButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:  Variant
  size?:     Size
  loading?:  boolean
  icon?:     React.ReactNode
  iconRight?: React.ReactNode
}

const variantClasses: Record<Variant, string> = {
  primary:     "bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_20px_hsl(160_80%_40%/0.3)] hover:shadow-[0_0_28px_hsl(160_80%_40%/0.5)]",
  secondary:   "bg-secondary text-secondary-foreground border border-border hover:border-primary/50 hover:text-foreground",
  ghost:       "bg-transparent text-muted-foreground hover:text-foreground hover:bg-secondary/50",
  destructive: "bg-destructive text-destructive-foreground shadow-[0_0_15px_hsl(0_84%_60%/0.25)] hover:shadow-[0_0_20px_hsl(0_84%_60%/0.4)]",
  legendary:   "bg-[linear-gradient(135deg,hsl(38_92%_50%),hsl(25_95%_55%),hsl(38_92%_50%))] text-[#0A0B10] bg-[length:200%_100%] hover:bg-right font-bold",
}

const sizeClasses: Record<Size, string> = {
  sm: "h-8  px-3 text-xs gap-1.5",
  md: "h-11 px-5 text-sm gap-2",
  lg: "h-12 px-7 text-base gap-2.5",
}

export function ArcadeButton({
  variant  = "primary",
  size     = "md",
  loading  = false,
  icon,
  iconRight,
  className,
  disabled,
  children,
  ...props
}: ArcadeButtonProps) {
  const isDisabled = disabled || loading

  return (
    <motion.button
      {...buttonPress}
      animate={isDisabled ? { scale: 1 } : undefined}
      className={cn(
        // base
        "relative inline-flex items-center justify-center rounded-[var(--radius)]",
        "font-body font-medium transition-all duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none",
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
      disabled={isDisabled}
      {...(props as object)}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        icon && <span className="shrink-0">{icon}</span>
      )}
      {children}
      {!loading && iconRight && <span className="shrink-0">{iconRight}</span>}
    </motion.button>
  )
}
