"use client"

import { useCallback, useState } from "react"
import { supabase } from "@/lib/supabase"
import { api, ApiError } from "@/lib/api"
import type { Profile } from "@/types/api"

export type EmailMergePending = {
  email: string
  detail: string
}

type EmailVerifyResponse = {
  access: string
  refresh: string
  user: Profile
  created: boolean
}

/**
 * Email OTP login: Supabase verifyOtp client-side → Django JWT via /auth/email/verify/.
 */
function isMergeRequiredError(err: unknown): err is ApiError & {
  data: { mergeRequired?: boolean; detail?: string }
} {
  return (
    err instanceof ApiError &&
    err.status === 409 &&
    typeof err.data === "object" &&
    err.data !== null &&
    (err.data as { mergeRequired?: boolean }).mergeRequired === true
  )
}

export function useEmailAuth(applySession: (access: string, refresh: string) => void) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mergePending, setMergePending] = useState<EmailMergePending | null>(null)

  const sendOtp = useCallback(async (email: string) => {
    const trimmed = email.trim()
    if (!trimmed) {
      throw new Error("Enter your email address.")
    }

    const { error: otpError } = await supabase.auth.signInWithOtp({ email: trimmed })
    if (otpError) {
      throw new Error(otpError.message)
    }
  }, [])

  const verifyOtpAndLogin = useCallback(
    async (email: string, token: string) => {
      const trimmedEmail = email.trim()
      const trimmedToken = token.trim()
      if (!trimmedEmail || !trimmedToken) {
        throw new Error("Enter the email and verification code.")
      }

      setIsSubmitting(true)
      setError(null)
      setMergePending(null)

      try {
        const { data, error: verifyError } = await supabase.auth.verifyOtp({
          email: trimmedEmail,
          token: trimmedToken,
          type: "email",
        })

        const accessToken = data.session?.access_token
        if (verifyError || !accessToken) {
          throw new Error(verifyError?.message || "Invalid verification code.")
        }

        const response = await api.post<EmailVerifyResponse>("/auth/email/verify/", {
          access_token: accessToken,
        })

        applySession(response.access, response.refresh)
        return response
      } catch (err) {
        if (isMergeRequiredError(err)) {
          setMergePending({
            email: trimmedEmail,
            detail:
              err.data.detail ??
              "Confirmation email sent. Check your inbox to link this account.",
          })
          return null
        }
        const message = err instanceof Error ? err.message : "Email login failed"
        setError(message)
        throw err
      } finally {
        setIsSubmitting(false)
      }
    },
    [applySession],
  )

  return {
    sendOtp,
    verifyOtpAndLogin,
    isSubmitting,
    error,
    setError,
    mergePending,
    clearMergePending: () => setMergePending(null),
  }
}
