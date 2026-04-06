"use client"

import { useState, useRef, useCallback } from "react"
import { ArcadeButton } from "@/components/themed/ArcadeButton"
import { ArcadeCard } from "@/components/themed/ArcadeCard"
import { supabase } from "@/lib/supabase"

interface StepEmailProps {
  onComplete: (email: string) => void
}

/**
 * Email verification step using Supabase Auth's built-in OTP.
 *
 * Flow:
 *   1. User enters email → supabase.auth.signInWithOtp({ email })
 *      Supabase sends a 6-digit code to their inbox automatically.
 *   2. User enters code → supabase.auth.verifyOtp({ email, token, type: "email" })
 *      Supabase validates the code server-side.
 *   3. On success → calls onComplete(email) to advance the quest chain.
 *
 * No custom OTP table, no bcrypt, no /api/otp routes needed.
 */
const EMAIL_STORAGE_KEY = "airdrop_quest_email_pending"

/** Persist the email that's waiting for OTP so it survives page refresh. */
function loadPendingEmail(): { email: string; stage: "input" | "otp" } {
  if (typeof window === "undefined") return { email: "", stage: "input" }
  const saved = sessionStorage.getItem(EMAIL_STORAGE_KEY)
  if (saved) return { email: saved, stage: "otp" }
  return { email: "", stage: "input" }
}

export function StepEmail({ onComplete }: StepEmailProps) {
  const pending = loadPendingEmail()
  const [stage, setStage] = useState<"input" | "otp">(pending.stage)
  const [email, setEmail] = useState(pending.email)
  const [otp, setOtp] = useState<string[]>(Array(6).fill(""))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  const sendOtp = async () => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return
    setLoading(true)
    setError(null)
    try {
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true },
      })
      if (otpError) throw new Error(otpError.message)
      sessionStorage.setItem(EMAIL_STORAGE_KEY, email)
      setStage("otp")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send code")
    } finally {
      setLoading(false)
    }
  }

  // Resend uses supabase.auth.resend() which explicitly requests a new OTP
  // instead of signInWithOtp() which may switch to a magic link for existing users.
  const resendOtp = async () => {
    setLoading(true)
    setError(null)
    setOtp(Array(6).fill(""))
    try {
      const { error: resendError } = await supabase.auth.resend({
        type: "signup",
        email,
      })
      if (resendError) throw new Error(resendError.message)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to resend code")
    } finally {
      setLoading(false)
    }
  }

  const verifyOtp = useCallback(async (code: string) => {
    if (code.length !== 6) return
    setLoading(true)
    setError(null)
    try {
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email,
        token: code,
        type: "email",
      })
      if (verifyError) throw new Error(verifyError.message)
      sessionStorage.removeItem(EMAIL_STORAGE_KEY)
      onComplete(email)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed")
    } finally {
      setLoading(false)
    }
  }, [email, onComplete])

  const handleOtpChange = (index: number, value: string) => {
    const digit = value.replace(/\D/, "").slice(-1)
    const next = [...otp]
    next[index] = digit
    setOtp(next)

    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }

    const fullCode = next.join("")
    if (fullCode.length === 6 && next.every(d => d !== "")) {
      verifyOtp(fullCode)
    }
  }

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6)
    if (!pasted) return
    const next = [...otp]
    for (let i = 0; i < pasted.length; i++) {
      next[i] = pasted[i]
    }
    setOtp(next)
    const focusIndex = Math.min(pasted.length, 5)
    inputRefs.current[focusIndex]?.focus()
    if (pasted.length === 6) {
      verifyOtp(pasted)
    }
  }

  // ── OTP entry stage ────────────────────────────────────────────────────────
  if (stage === "otp") {
    return (
      <ArcadeCard className="space-y-4">
        <p className="font-body text-sm text-muted-foreground">
          Code sent to <span className="text-foreground">{email}</span>.
          Check your inbox (and spam folder).
        </p>

        <div className="flex gap-2 justify-center" onPaste={handleOtpPaste}>
          {Array.from({ length: 6 }).map((_, i) => (
            <input
              key={i}
              ref={(el) => { inputRefs.current[i] = el }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={otp[i]}
              onChange={(e) => handleOtpChange(i, e.target.value)}
              onKeyDown={(e) => handleOtpKeyDown(i, e)}
              className="w-10 h-12 text-center font-mono text-lg bg-background border border-border
                         rounded-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none
                         text-foreground transition-colors"
            />
          ))}
        </div>

        {error && (
          <p className="font-body text-xs text-destructive text-center">{error}</p>
        )}

        <ArcadeButton
          size="lg"
          className="w-full"
          loading={loading}
          onClick={() => verifyOtp(otp.join(""))}
          disabled={otp.filter(d => d !== "").length < 6}
        >
          Verify Code
        </ArcadeButton>

        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => { setStage("input"); setOtp(Array(6).fill("")); setError(null); sessionStorage.removeItem(EMAIL_STORAGE_KEY) }}
            className="font-mono text-[10px] text-muted-foreground/50 hover:text-muted-foreground
                       transition-colors uppercase tracking-widest"
          >
            ← Wrong email?
          </button>
          <button
            type="button"
            onClick={resendOtp}
            disabled={loading}
            className="font-mono text-[10px] text-muted-foreground/50 hover:text-muted-foreground
                       transition-colors uppercase tracking-widest disabled:opacity-40"
          >
            Resend code
          </button>
        </div>
      </ArcadeCard>
    )
  }

  // ── Email input stage ──────────────────────────────────────────────────────
  return (
    <ArcadeCard className="space-y-4">
      <p className="font-body text-sm text-muted-foreground">
        We&apos;ll send a 6-digit code to verify this is a real inbox.
      </p>
      <div className="space-y-1.5">
        <label htmlFor="otp-email" className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Email <span className="text-destructive">*</span>
        </label>
        <input
          id="otp-email"
          type="email"
          placeholder="you@gmail.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") sendOtp() }}
          autoComplete="email"
          className="w-full px-4 py-2.5 rounded-sm border border-border bg-transparent text-sm
                     text-foreground placeholder:text-muted-foreground/40 focus:outline-none
                     focus:ring-2 focus:ring-ring font-body"
        />
      </div>
      {error && (
        <p className="font-body text-xs text-destructive">{error}</p>
      )}
      <ArcadeButton
        size="lg"
        className="w-full"
        loading={loading}
        onClick={sendOtp}
        disabled={!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)}
      >
        Send Code →
      </ArcadeButton>
    </ArcadeCard>
  )
}
