"use client"

import { FormEvent, useState } from "react"
import { Mail } from "lucide-react"
import { ArcadeButton } from "@/components/themed/ArcadeButton"
import { useEmailAuth } from "@/hooks/useEmailAuth"
import {
  resolvePostAuthDestination,
  setPostAuthDestination,
} from "@/lib/postAuthRedirect"

type EmailLoginSectionProps = {
  applySession: (access: string, refresh: string) => void
}

export function EmailLoginSection({ applySession }: EmailLoginSectionProps) {
  const {
    sendOtp,
    verifyOtpAndLogin,
    isSubmitting,
    error,
    setError,
    mergePending,
    clearMergePending,
  } = useEmailAuth(applySession)
  const [email, setEmail] = useState("")
  const [otp, setOtp] = useState("")
  const [otpSent, setOtpSent] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  const displayError = localError || error

  const handleSendOtp = async (event: FormEvent) => {
    event.preventDefault()
    setLocalError(null)
    setError(null)
    clearMergePending()
    try {
      await sendOtp(email)
      setOtpSent(true)
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Could not send code")
    }
  }

  const handleVerify = async (event: FormEvent) => {
    event.preventDefault()
    setLocalError(null)
    setError(null)
    clearMergePending()
    try {
      const response = await verifyOtpAndLogin(email, otp)
      if (!response) return
      setPostAuthDestination(
        resolvePostAuthDestination({
          authMethod: "email",
          created: response.created,
          walletAddress: response.user?.walletAddress,
        }),
      )
    } catch {
      // useEmailAuth sets error state
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Mail size={14} className="text-primary shrink-0" aria-hidden />
        <div className="space-y-0.5">
          <h2 className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Email login
          </h2>
          <p className="text-xs text-muted-foreground">
            No wallet required — we&apos;ll email you a one-time code.
          </p>
        </div>
      </div>

      {mergePending && (
        <div
          className="rounded-sm border border-primary/40 bg-primary/10 px-3 py-3 space-y-1"
          role="status"
        >
          <p className="text-sm text-primary font-body font-medium">
            Check your email to link accounts
          </p>
          <p className="text-xs text-muted-foreground font-body">
            {mergePending.detail}
            {mergePending.email ? (
              <>
                {" "}
                We sent a confirmation link to{" "}
                <span className="text-foreground font-medium">{mergePending.email}</span>.
              </>
            ) : null}
          </p>
        </div>
      )}

      {!mergePending && !otpSent ? (
        <form onSubmit={handleSendOtp} className="space-y-3">
          <input
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-sm border border-border bg-background px-3 py-2.5 text-sm font-body focus:outline-none focus:ring-2 focus:ring-ring"
            required
          />
          <ArcadeButton
            type="submit"
            size="md"
            variant="secondary"
            loading={isSubmitting}
            disabled={isSubmitting}
            className="w-full"
          >
            Send verification code
          </ArcadeButton>
        </form>
      ) : !mergePending ? (
        <form onSubmit={handleVerify} className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Code sent to <span className="text-foreground font-medium">{email}</span>
          </p>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="6-digit code"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            className="w-full rounded-sm border border-border bg-background px-3 py-2.5 text-sm font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-ring"
            required
          />
          <ArcadeButton
            type="submit"
            size="md"
            loading={isSubmitting}
            disabled={isSubmitting}
            className="w-full"
          >
            Verify and continue
          </ArcadeButton>
          <button
            type="button"
            onClick={() => {
              setOtpSent(false)
              setOtp("")
            }}
            className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Use a different email
          </button>
        </form>
      ) : null}

      {displayError && (
        <p className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-sm px-3 py-2">
          {displayError}
        </p>
      )}
    </div>
  )
}
