"use client"

import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { needsOnboarding, postAuthPath, type AuthUser } from "@/lib/onboarding"
import { useAppStore } from "@/stores/useAppStore"

export function useAuth() {
  const accessToken = useAppStore((s) => s.accessToken)
  const walletAddress = useAppStore((s) => s.walletAddress)
  const setAuth = useAppStore((s) => s.setAuth)
  const clearAuth = useAppStore((s) => s.clearAuth)

  const { data: user } = useQuery({
    queryKey: ["auth", "profile"],
    queryFn: () => api.get<AuthUser>("/auth/me/"),
    enabled: Boolean(accessToken || (typeof window !== "undefined" && localStorage.getItem("auth_token"))),
  })

  const resolvedUser = user ?? null

  return {
    isAuthenticated: !!accessToken || (typeof window !== "undefined" && !!localStorage.getItem("auth_token")),
    accessToken,
    walletAddress: walletAddress ?? resolvedUser?.walletAddress ?? null,
    user: resolvedUser,
    needsOnboarding: needsOnboarding(resolvedUser),
    postAuthPath: postAuthPath(resolvedUser),
    setAuth,
    clearAuth,
  }
}
