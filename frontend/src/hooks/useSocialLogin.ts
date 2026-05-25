"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { api } from "@/lib/api"

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ?? process.env.BACKEND_URL ?? "http://localhost:8001"

type SocialProvider = "twitter" | "discord" | "telegram"

function loginRedirectUri() {
  return typeof window !== "undefined"
    ? `${window.location.origin}/login`
    : "http://localhost:3000/login"
}

async function startOAuth(provider: "twitter" | "discord") {
  const params = new URLSearchParams({
    mode: "login",
    redirect_uri: loginRedirectUri(),
  })
  const start = await api.get<{ authorizeUrl: string }>(
    `/auth/${provider}/start/?${params.toString()}`,
  )
  if (typeof window !== "undefined") {
    window.location.href = start.authorizeUrl
  }
}

async function startTelegramLogin(): Promise<string | null> {
  const start = await api.get<{ deepLink: string; pollKey: string | null }>(
    "/auth/telegram/start/?mode=login",
  )
  if (typeof window !== "undefined" && start.deepLink) {
    window.open(start.deepLink, "_blank", "noopener,noreferrer")
  }
  return start.pollKey
}

export function useSocialLogin(applySession: (access: string, refresh: string) => void) {
  const [loadingProvider, setLoadingProvider] = useState<SocialProvider | null>(null)
  const [error, setError] = useState<string | null>(null)
  const pollRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (pollRef.current) {
        window.clearInterval(pollRef.current)
      }
    }
  }, [])

  const pollTelegram = useCallback(
    (pollKey: string) => {
      if (pollRef.current) {
        window.clearInterval(pollRef.current)
      }
      pollRef.current = window.setInterval(async () => {
        try {
          const res = await fetch(
            `${BACKEND_URL}/api/v1/auth/telegram/login/poll/?poll_key=${encodeURIComponent(pollKey)}`,
          )
          if (res.status === 404) {
            setError("Telegram login expired. Try again.")
            if (pollRef.current) window.clearInterval(pollRef.current)
            setLoadingProvider(null)
            return
          }
          if (!res.ok) return
          const payload = await res.json()
          if (payload.status === "complete" && payload.access && payload.refresh) {
            if (pollRef.current) window.clearInterval(pollRef.current)
            applySession(payload.access, payload.refresh)
            setLoadingProvider(null)
          }
        } catch {
          // keep polling
        }
      }, 2000)
    },
    [applySession],
  )

  const loginWith = useCallback(
    async (provider: SocialProvider) => {
      setError(null)
      setLoadingProvider(provider)
      try {
        if (provider === "telegram") {
          const pollKey = await startTelegramLogin()
          if (!pollKey) {
            throw new Error("Telegram login is unavailable.")
          }
          pollTelegram(pollKey)
          return
        }
        await startOAuth(provider)
      } catch (err) {
        setLoadingProvider(null)
        setError(err instanceof Error ? err.message : "Social login failed")
      }
    },
    [pollTelegram],
  )

  return { loginWith, loadingProvider, error, setError }
}

/** Parse ?twitter=login&access=... style OAuth callbacks on /login. */
export function consumeSocialLoginCallback(
  applySession: (access: string, refresh: string) => void,
): boolean {
  if (typeof window === "undefined") return false
  const params = new URLSearchParams(window.location.search)
  const provider = ["twitter", "discord"].find((p) => params.get(p) === "login")
  const access = params.get("access")
  const refresh = params.get("refresh")
  if (!provider || !access) return false

  applySession(access, refresh || "")
  const cleanUrl = window.location.pathname
  window.history.replaceState({}, "", cleanUrl)
  return true
}
