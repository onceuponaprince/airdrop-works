"use client"

import { useEffect, useRef } from "react"
import { useParticleWallet } from "@/hooks/useParticleWallet"
import { useWeb3Auth } from "@/hooks/useWeb3Auth"

/**
 * Clears Django JWT when the user disconnects their wallet so stale sessions
 * cannot access the (app) routes after disconnect.
 */
export function WalletSessionSync() {
  const wallet = useParticleWallet()
  const { logout, isAuthenticated } = useWeb3Auth()
  const wasConnected = useRef(false)

  useEffect(() => {
    if (!wallet.available) return

    if (wasConnected.current && !wallet.isConnected && isAuthenticated) {
      logout()
    }
    wasConnected.current = wallet.isConnected
  }, [wallet.available, wallet.isConnected, isAuthenticated, logout])

  return null
}
