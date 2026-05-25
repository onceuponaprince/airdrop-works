"use client"

import { useEffect } from "react"
import { consumeSocialLoginCallback, useSocialLogin } from "@/hooks/useSocialLogin"

type SocialLoginButtonsProps = {
  applySession: (access: string, refresh: string) => void
}

const PROVIDERS = [
  { id: "twitter" as const, label: "Continue with X" },
  { id: "discord" as const, label: "Continue with Discord" },
  { id: "github" as const, label: "Continue with GitHub" },
  { id: "telegram" as const, label: "Continue with Telegram" },
]

export function SocialLoginButtons({ applySession }: SocialLoginButtonsProps) {
  const { loginWith, loadingProvider, error } = useSocialLogin(applySession)

  useEffect(() => {
    consumeSocialLoginCallback(applySession)
  }, [applySession])

  return (
    <div className="space-y-3">
      <p className="font-mono text-[10px] uppercase tracking-widest text-[--muted-foreground]">
        Social login
      </p>
      <div className="grid gap-2">
        {PROVIDERS.map((provider) => (
          <button
            key={provider.id}
            type="button"
            disabled={loadingProvider !== null}
            onClick={() => loginWith(provider.id)}
            className="w-full px-4 py-2 rounded border border-[--border] text-sm font-medium hover:border-[--primary]/50 hover:bg-[--secondary]/40 disabled:opacity-50 transition-colors"
          >
            {loadingProvider === provider.id ? "Redirecting…" : provider.label}
          </button>
        ))}
      </div>
      {loadingProvider === "telegram" && (
        <p className="text-xs text-[--muted-foreground]">
          Open Telegram, tap Start, then return here — we&apos;ll detect when you&apos;re linked.
        </p>
      )}
      {error && <p className="text-sm text-[--destructive]">{error}</p>}
    </div>
  )
}
