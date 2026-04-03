"use client"

import { useState } from "react"
import { QuestChain, type QuestStep } from "@/components/marketing/QuestChain"
import { StepWallet } from "@/components/marketing/steps/StepWallet"
import { StepEmail } from "@/components/marketing/steps/StepEmail"
import { StepTwitter } from "@/components/marketing/steps/StepTwitter"
import { StepSubmit } from "@/components/marketing/steps/StepSubmit"

/**
 * Waitlist signup orchestrator — a 4-step quest chain:
 *   1. Connect wallet (mandatory)
 *   2. Verify email
 *   3. Connect Twitter (optional — skip allowed)
 *   4. Claim your score (submit to Supabase)
 */
export function WaitlistForm() {
  const [currentStep, setCurrentStep] = useState<QuestStep>("wallet")
  const [completedSteps, setCompletedSteps] = useState<QuestStep[]>([])

  // Collected data across steps
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [email, setEmail] = useState<string | null>(null)
  const [twitterHandle, setTwitterHandle] = useState<string | null>(null)

  const completeStep = (step: QuestStep, nextStep: QuestStep) => {
    setCompletedSteps(prev => [...new Set([...prev, step])])
    setCurrentStep(nextStep)
  }

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
          onComplete={(handle) => {
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
          onSuccess={() => completeStep("submit", "submit")}
        />
      )}
    </QuestChain>
  )
}
