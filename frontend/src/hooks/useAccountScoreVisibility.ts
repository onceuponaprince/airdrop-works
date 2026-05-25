"use client"

import { useCallback, useEffect, useState } from "react"
import {
  ACCOUNT_SCORE_GATE_CHANGED,
  canShowAccountScore,
} from "@/lib/canShowAccountScore"

/** Client hook: visibility unlock after waitlist join or landing judge demo. */
export function useAccountScoreVisibility() {
  const [hydrated, setHydrated] = useState(false)
  const [visible, setVisible] = useState(false)

  const refresh = useCallback(() => {
    setVisible(canShowAccountScore())
  }, [])

  useEffect(() => {
    refresh()
    setHydrated(true)

    const onGateChange = () => refresh()
    window.addEventListener(ACCOUNT_SCORE_GATE_CHANGED, onGateChange)
    window.addEventListener("storage", onGateChange)
    return () => {
      window.removeEventListener(ACCOUNT_SCORE_GATE_CHANGED, onGateChange)
      window.removeEventListener("storage", onGateChange)
    }
  }, [refresh])

  return { hydrated, visible: hydrated && visible }
}
