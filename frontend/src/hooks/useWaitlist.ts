"use client"

import { useState } from "react"
import { useAppStore } from "@/stores/useAppStore"
import { events } from "@/lib/analytics"
import { buildReferralUrl } from "@/lib/supabase"
import type { Branch } from "@/lib/constants"

interface WaitlistFormData {
  email:          string
  walletAddress?: string
  primaryBranch?: Branch
  referralCode?:  string   // from ?ref= query param
}

interface WaitlistState {
  status:       "idle" | "submitting" | "success" | "error"
  rank:         number | null
  referralCode: string | null
  referralUrl:  string | null
  alreadyExists: boolean
  error:        string | null
}

export function useWaitlist() {
  const setWaitlistRank = useAppStore((s) => s.setWaitlistRank)

  const [state, setState] = useState<WaitlistState>({
    status:       "idle",
    rank:         null,
    referralCode: null,
    referralUrl:  null,
    alreadyExists: false,
    error:        null,
  })

  const submit = async (data: WaitlistFormData) => {
    setState((s) => ({ ...s, status: "submitting", error: null }))

    // Read referral code from URL if not provided
    const refCode =
      data.referralCode ||
      (typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("ref") || undefined
        : undefined)

    try {
      const res = await fetch("/api/waitlist", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email:         data.email,
          walletAddress: data.walletAddress || undefined,
          primaryBranch: data.primaryBranch || undefined,
          referralCode:  refCode,
        }),
      })

      const json = await res.json()

      if (!res.ok) {
        throw new Error(json.error || `Request failed (${res.status})`)
      }

      const { rank, referralCode, referralUrl, alreadyExists } = json

      setWaitlistRank(rank)
      setState({
        status:       "success",
        rank,
        referralCode,
        referralUrl:  referralUrl || buildReferralUrl(referralCode),
        alreadyExists,
        error:        null,
      })

      events.waitlistSignup(!!data.walletAddress, data.primaryBranch)
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Something went wrong. Try again."
      setState((s) => ({ ...s, status: "error", error: message }))
    }
  }

  const reset = () =>
    setState({
      status: "idle", rank: null, referralCode: null,
      referralUrl: null, alreadyExists: false, error: null,
    })

  return { ...state, submit, reset }
}
