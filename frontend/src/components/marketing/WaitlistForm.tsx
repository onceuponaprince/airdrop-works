"use client"

import { Suspense, useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { QuestChain, type QuestStep } from "@/components/marketing/QuestChain"
import { StepWallet } from "@/components/marketing/steps/StepWallet"
import { StepEmail } from "@/components/marketing/steps/StepEmail"
import { StepTwitter } from "@/components/marketing/steps/StepTwitter"
import { StepSubmit } from "@/components/marketing/steps/StepSubmit"
import type { AccountAnalysis } from "@/types/api"
import { events } from "@/lib/analytics"
import { parseWaitlistIntent } from "@/lib/waitlist-intent"

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
  return (
    <Suspense fallback={null}>
      <WaitlistFormInner />
    </Suspense>
  )
}

function WaitlistFormInner() {
  const searchParams = useSearchParams()
  const signupIntent = parseWaitlistIntent(searchParams.get("intent"))
  const saved = loadPersistedState()
  // Mount-detection pattern. Must start `false` so the client's first render
  // matches the server's null return below — otherwise React throws hydration
  // error #418 ("expected HTML, got empty"). See:
  // https://react.dev/reference/react-dom/client/hydrateRoot
  const [hydrated, setHydrated] = useState(false)
  useEffect(() => {
    // Single-shot mount flip; intentional setState-in-effect for SSR-safe gating.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHydrated(true)
  }, [])
  const [currentStep, setCurrentStep] = useState<QuestStep>(saved?.currentStep ?? "wallet")
  const [completedSteps, setCompletedSteps] = useState<QuestStep[]>(saved?.completedSteps ?? [])
  const [walletAddress, setWalletAddress] = useState<string | null>(saved?.walletAddress ?? null)
  const [email, setEmail] = useState<string | null>(saved?.email ?? null)
  const [twitterHandle, setTwitterHandle] = useState<string | null>(saved?.twitterHandle ?? null)
  const [twitterScoreData, setTwitterScoreData] = useState<AccountAnalysis | null>(null)
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

  useEffect(() => {
    if (!hydrated) return
    events.waitlistStepStarted(currentStep)
  }, [hydrated, currentStep])

  const completeStep = (step: QuestStep, nextStep: QuestStep) => {
    events.waitlistStepCompleted(step)
    setCompletedSteps(prev => [...new Set([...prev, step])])
    setCurrentStep(nextStep)
  }

  const goBackTo = (step: QuestStep) => {
    // Remove the target step (and anything after it) from completedSteps
    // so the user can redo it
    const stepOrder: QuestStep[] = ["wallet", "email", "twitter", "submit"]
    const targetIdx = stepOrder.indexOf(step)
    setCompletedSteps(prev => prev.filter(s => stepOrder.indexOf(s) < targetIdx))
    setCurrentStep(step)
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
          walletFirstFlow
          onComplete={(verifiedEmail) => {
            setEmail(verifiedEmail)
            completeStep("email", "twitter")
          }}
          onBack={() => goBackTo("wallet")}
        />
      )}

      {currentStep === "twitter" && (
        <StepTwitter
          onComplete={(handle, _token, scoreData) => {
            setTwitterHandle(handle)
            if (scoreData) setTwitterScoreData(scoreData)
            completeStep("twitter", "submit")
          }}
          onSkip={() => completeStep("twitter", "submit")}
          onBack={() => goBackTo("email")}
        />
      )}

      {currentStep === "submit" && walletAddress && email && (
        <StepSubmit
          walletAddress={walletAddress}
          email={email}
          twitterHandle={twitterHandle ?? undefined}
          twitterScoreData={twitterScoreData ?? undefined}
          signupIntent={signupIntent}
          onBack={() => goBackTo("twitter")}
          onSuccess={() => {
            clearPersistedState()
            completeStep("submit", "submit")
          }}
        />
      )}
    </QuestChain>
  )
}
