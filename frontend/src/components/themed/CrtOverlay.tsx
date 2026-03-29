import { cn } from "@/lib/utils"

interface CrtOverlayProps {
  className?: string
  /** Show the screen glow ring too (default false — scanlines only) */
  glow?: boolean
  children?: React.ReactNode
}

/**
 * Wraps children in a position:relative container with the CRT scanline
 * pseudo-element and optional screen-glow box-shadow.
 *
 * Usage:
 *   <CrtOverlay glow>
 *     <ScoreCard ... />
 *   </CrtOverlay>
 */
export function CrtOverlay({ className, glow = false, children }: CrtOverlayProps) {
  return (
    <div
      className={cn(
        "relative crt-scanlines",
        glow && "screen-glow",
        className
      )}
    >
      {children}
    </div>
  )
}
