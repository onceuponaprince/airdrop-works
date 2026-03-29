"use client"

import { useState } from "react"

/**
 * Reads the ?ref=<code> query param from the URL on mount.
 * Returns the referral code if present, or null.
 *
 * The code is also persisted to sessionStorage so it survives
 * soft navigations within the same tab.
 */
export function useReferral(): string | null {
  const [referralCode] = useState<string | null>(() => {
    if (typeof window === "undefined") return null

    const params = new URLSearchParams(window.location.search)
    const refFromUrl = params.get("ref")
    if (refFromUrl) {
      sessionStorage.setItem("airdrop_ref", refFromUrl)
      return refFromUrl
    }

    return sessionStorage.getItem("airdrop_ref")
  })

  return referralCode
}
