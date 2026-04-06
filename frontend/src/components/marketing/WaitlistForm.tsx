"use client"

import { useState, useEffect } from "react"
import { QuestChain, type QuestStep } from "@/components/marketing/QuestChain"
import { StepWallet } from "@/components/marketing/steps/StepWallet"
import { StepEmail } from "@/components/marketing/steps/StepEmail"
import { StepTwitter } from "@/components/marketing/steps/StepTwitter"
import { StepSubmit } from "@/components/marketing/steps/StepSubmit"

const STORAGE_KEY = "airdrop_quest_state"
const ADMIN_BYPASS_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_BYPASS ?? ""

interface PersistedState {
  currentStep: QuestStep
  completedSteps: QuestStep[]
  walletAddress: string | null
  email: string | null
  twitterHandle: string | null
}

function loadPersistedState(): PersistedState | null {
  if (typeof window === "undefined") return null
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as PersistedState
  } catch {
    return null
  }
}

function persistState(state: PersistedState) {
  if (typeof window === "undefined") return
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

function clearPersistedState() {
  if (typeof window === "undefined") return
  sessionStorage.removeItem(STORAGE_KEY)
}

/**
 * Waitlist signup orchestrator — a 4-step quest chain:
 *   1. Connect wallet (mandatory)
 *   2. Verify email (6-digit OTP)
 *   3. Connect Twitter (optional — OAuth 2.0 PKCE, skip allowed)
 *   4. Claim your score (submit to Supabase)
 *
 * State is persisted in sessionStorage so the flow survives the Twitter
 * OAuth redirect (user leaves the page and comes back).
 */
export function WaitlistForm() {
  const saved = loadPersistedState()
  const [hydrated] = useState(() => typeof window !== "undefined")
  const [currentStep, setCurrentStep] = useState<QuestStep>(saved?.currentStep ?? "wallet")
  const [completedSteps, setCompletedSteps] = useState<QuestStep[]>(saved?.completedSteps ?? [])
  const [walletAddress, setWalletAddress] = useState<string | null>(saved?.walletAddress ?? null)
  const [email, setEmail] = useState<string | null>(saved?.email ?? null)
  const [twitterHandle, setTwitterHandle] = useState<string | null>(saved?.twitterHandle ?? null)

  // Hidden admin bypass — type the password anywhere on step 1 to skip to step 3.
  // Password is set via NEXT_PUBLIC_ADMIN_BYPASS env var.
  const [bypassBuffer, setBypassBuffer] = useState("")
  useEffect(() => {
    if (!ADMIN_BYPASS_PASSWORD || currentStep !== "wallet") return
    const handler = (e: KeyboardEvent) => {
      if (e.key.length !== 1) return // ignore modifier keys
      const next = (bypassBuffer + e.key).slice(-ADMIN_BYPASS_PASSWORD.length)
      setBypassBuffer(next)
      if (next === ADMIN_BYPASS_PASSWORD) {
        setWalletAddress("0xADMIN")
        setEmail("admin@airdrop.works")
        setCompletedSteps(["wallet", "email"])
        setCurrentStep("twitter")
        setBypassBuffer("")
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [bypassBuffer, currentStep])

  // Persist state whenever it changes
  useEffect(() => {
    if (!hydrated) return
    persistState({ currentStep, completedSteps, walletAddress, email, twitterHandle })
  }, [hydrated, currentStep, completedSteps, walletAddress, email, twitterHandle])

  const completeStep = (step: QuestStep, nextStep: QuestStep) => {
    setCompletedSteps(prev => [...new Set([...prev, step])])
    setCurrentStep(nextStep)
  }

  // Don't render until sessionStorage is checked (avoids flash of step 1)
  if (!hydrated) return null

  return (
    <QuestChain currentStep={currentStep} completedSteps={completedSteps}>
      {currentStep === "wallet" && (
        <StepWallet
          onComplete={(address) => {
            setWalletAddress(address)
            completeStep("wallet", "email")
          }}
        />
      )}

      {currentStep === "email" && (
        <StepEmail
          onComplete={(verifiedEmail) => {
            setEmail(verifiedEmail)
            completeStep("email", "twitter")
          }}
        />
      )}

      {currentStep === "twitter" && (
        <StepTwitter
          onComplete={(handle, _token) => {
            setTwitterHandle(handle)
            completeStep("twitter", "submit")
          }}
          onSkip={() => completeStep("twitter", "submit")}
        />
      )}

      {currentStep === "submit" && walletAddress && email && (
        <StepSubmit
          walletAddress={walletAddress}
          email={email}
          twitterHandle={twitterHandle ?? undefined}
          onSuccess={() => {
            clearPersistedState()
            completeStep("submit", "submit")
          }}
        />
      )}
    </QuestChain>
  )
}
