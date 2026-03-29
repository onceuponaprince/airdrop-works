"use client"

import { useEffect, useRef, useState } from "react"

interface UseAnimatedCounterOptions {
  duration?: number // ms
  delay?: number    // ms
  easing?: (t: number) => number
}

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3)

export function useAnimatedCounter(
  targetValue: number,
  options: UseAnimatedCounterOptions = {}
) {
  const { duration = 1200, delay = 300, easing = easeOut } = options
  const [displayValue, setDisplayValue] = useState(() =>
    typeof window === "undefined" ? targetValue : 0
  )
  const rafRef = useRef<number | null>(null)
  const startTimeRef = useRef<number | null>(null)

  useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    const timeout = setTimeout(() => {
      const animate = (timestamp: number) => {
        if (!startTimeRef.current) startTimeRef.current = timestamp

        const elapsed = timestamp - startTimeRef.current
        const progress = Math.min(elapsed / duration, 1)
        const easedProgress = easing(progress)

        setDisplayValue(Math.round(easedProgress * targetValue))

        if (progress < 1) {
          rafRef.current = requestAnimationFrame(animate)
        } else {
          setDisplayValue(targetValue)
        }
      }

      rafRef.current = requestAnimationFrame(animate)
    }, delay)

    return () => {
      clearTimeout(timeout)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      startTimeRef.current = null
    }
  }, [targetValue, duration, delay, easing])

  return displayValue
}
