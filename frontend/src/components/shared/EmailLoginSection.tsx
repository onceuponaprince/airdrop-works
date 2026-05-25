"use client"

import { FormEvent, useState } from "react"
import { useEmailAuth } from "@/hooks/useEmailAuth"

type EmailLoginSectionProps = {
  applySession: (access: string, refresh: string) => void
}

export function EmailLoginSection({ applySession }: EmailLoginSectionProps) {
  const { sendOtp, verifyOtpAndLogin, isSubmitting, error, setError } =
    useEmailAuth(applySession)
  const [email, setEmail] = useState("")
  const [otp, setOtp] = useState("")
  const [otpSent, setOtpSent] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  const displayError = localError || error

  const handleSendOtp = async (event: FormEvent) => {
    event.preventDefault()
    setLocalError(null)
    setError(null)
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
    try {
      await verifyOtpAndLogin(email, otp)
    } catch {
      // useEmailAuth sets error state
    }
  }

  return (
    <div className="space-y-4 border-t border-[--border] pt-4">
      <div className="space-y-1">
        <h2 className="font-heading text-sm font-semibold">Email login</h2>
        <p className="text-xs text-[--muted-foreground]">
          No wallet required — we&apos;ll email you a one-time code.
        </p>
      </div>

      {!otpSent ? (
        <form onSubmit={handleSendOtp} className="space-y-3">
          <input
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded border border-[--border] bg-[--background] px-3 py-2 text-sm"
            required
          />
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full px-4 py-2 rounded border border-[--primary] text-[--primary] text-sm font-medium hover:bg-[--primary]/10 disabled:opacity-50"
          >
            {isSubmitting ? "Sending…" : "Send verification code"}
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerify} className="space-y-3">
          <p className="text-xs text-[--muted-foreground]">
            Code sent to <span className="text-[--foreground]">{email}</span>
          </p>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="6-digit code"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            className="w-full rounded border border-[--border] bg-[--background] px-3 py-2 text-sm font-mono tracking-widest"
            required
          />
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full px-4 py-2 rounded bg-[--primary] text-[--primary-foreground] text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            {isSubmitting ? "Verifying…" : "Verify and continue"}
          </button>
          <button
            type="button"
            onClick={() => {
              setOtpSent(false)
              setOtp("")
            }}
            className="w-full text-xs text-[--muted-foreground] hover:text-[--foreground]"
          >
            Use a different email
          </button>
        </form>
      )}

      {displayError && (
        <p className="text-sm text-[--destructive]">{displayError}</p>
      )}
    </div>
  )
}
