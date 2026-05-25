"use client"

import { useEffect } from "react"
import { Github, MessageCircle, Send } from "lucide-react"
import { consumeSocialLoginCallback, useSocialLogin } from "@/hooks/useSocialLogin"
import { cn } from "@/lib/utils"

type SocialLoginButtonsProps = {
  applySession: (access: string, refresh: string) => void
}

const PROVIDERS = [
  { id: "github" as const, label: "GitHub", icon: Github },
  { id: "twitter" as const, label: "X (Twitter)", icon: XIcon },
  { id: "discord" as const, label: "Discord", icon: MessageCircle },
  { id: "telegram" as const, label: "Telegram", icon: Send },
]

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

export function SocialLoginButtons({ applySession }: SocialLoginButtonsProps) {
  const { loginWith, loadingProvider, error } = useSocialLogin(applySession)

  useEffect(() => {
    consumeSocialLoginCallback(applySession)
  }, [applySession])

  return (
    <div className="space-y-3">
      <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        Social login
      </p>
      <div className="grid gap-2">
        {PROVIDERS.map((provider) => {
          const Icon = provider.icon
          const isLoading = loadingProvider === provider.id
          return (
            <button
              key={provider.id}
              type="button"
              disabled={loadingProvider !== null}
              onClick={() => loginWith(provider.id)}
              className={cn(
                "w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-sm",
                "border border-border text-sm font-body font-medium",
                "hover:border-primary/50 hover:bg-secondary/40 hover:text-foreground",
                "disabled:opacity-50 transition-colors",
                isLoading && "border-primary/40 bg-primary/5",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {isLoading ? "Redirecting…" : `Continue with ${provider.label}`}
            </button>
          )
        })}
      </div>
      {loadingProvider === "telegram" && (
        <p className="text-xs text-muted-foreground bg-secondary/30 border border-border rounded-sm px-3 py-2">
          Open Telegram, tap Start, then return here — we&apos;ll detect when you&apos;re linked.
        </p>
      )}
      {error && (
        <p className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-sm px-3 py-2">
          {error}
        </p>
      )}
    </div>
  )
}
