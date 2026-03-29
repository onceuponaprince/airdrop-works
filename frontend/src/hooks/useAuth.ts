"use client"

import { useAppStore } from "@/stores/useAppStore"

export function useAuth() {
  const accessToken = useAppStore((s) => s.accessToken)
  const walletAddress = useAppStore((s) => s.walletAddress)
  const setAuth = useAppStore((s) => s.setAuth)
  const clearAuth = useAppStore((s) => s.clearAuth)

  return {
    isAuthenticated: !!accessToken,
    accessToken,
    walletAddress,
    setAuth,
    clearAuth,
  }
}
