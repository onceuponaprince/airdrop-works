"use client"

/**
 * Particle Network ConnectKit provider wrapper.
 * Separated into its own file so the React component is declared at
 * module scope (not created during render) — required by the
 * react-hooks/static-components lint rule.
 */

import { ConnectKitProvider, createConfig } from "@particle-network/connectkit"
import { useAccount, useDisconnect, useModal } from "@particle-network/connectkit"
import { evmWalletConnectors } from "@particle-network/connectkit/evm"
import { avalanche, base } from "wagmi/chains"
import { ParticleWalletContext } from "@/hooks/useParticleWallet"
import { useState, useCallback } from "react"
import { handleWalletError, getFallbackWalletConnectors } from './walletUtils'

const projectId = (process.env.NEXT_PUBLIC_PROJECT_ID ?? "").trim()
const clientKey = (process.env.NEXT_PUBLIC_CLIENT_KEY ?? "").trim()
const appId = (process.env.NEXT_PUBLIC_APP_ID ?? "").trim()

// Wallet Error Handling (Functions 1-2)

/**
 * Maps wallet errors to user-friendly messages with suggested actions.
 * 
 * @param error - The wallet error object/message
 * @param retryCallback - Optional callback to retry the operation
 * @returns { type: 'error'|'warning', message: string, action?: string }
 */
// wallet helper functions moved to walletUtils.ts to keep ParticleProvider imports
// light-weight for unit tests.

const particleConfig = createConfig({
  projectId,
  clientKey,
  appId,
  chains: [avalanche, base] as const,
  walletConnectors: [
    evmWalletConnectors({
      metadata: {
        name: "AI(r)Drop",
        url: typeof window !== "undefined" ? window.location.origin : "https://airdrop.works",
      },
    }),
  ],
  appearance: {
    mode: "dark",
    recommendedWallets: [
      { walletId: "metaMask", label: "Recommended" },
    ],
  },
})

function ParticleWalletBridge({ children }: { children: React.ReactNode }) {
  const { address, isConnected } = useAccount()
  const { setOpen } = useModal()
  const { disconnect } = useDisconnect()
  const [lastError, setLastError] = useState<{
    type: 'error' | 'warning'
    message: string
    action?: string
  } | undefined>(undefined)

  const openConnect = useCallback(() => {
    // clear previous error when reopening
    setLastError(undefined)
    setOpen(true)
  }, [setOpen])

  const retryConnect = useCallback(() => {
    // allow UI to trigger a fresh connect attempt
    setLastError(undefined)
    setOpen(true)
  }, [setOpen])

  return (
    <ParticleWalletContext.Provider
      value={{
        available: true,
        address,
        isConnected: isConnected && !!address,
        openConnectModal: openConnect,
        disconnect,
        lastError,
        retryConnect,
      }}
    >
      {children}
    </ParticleWalletContext.Provider>
  )
}

export function ParticleProviderWrapper({ children }: { children: React.ReactNode }) {
  return (
    <ConnectKitProvider config={particleConfig}>
      <ParticleWalletBridge>{children}</ParticleWalletBridge>
    </ConnectKitProvider>
  )
}
