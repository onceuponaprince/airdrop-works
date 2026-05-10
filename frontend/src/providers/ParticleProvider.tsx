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
export function handleWalletError(
  error: Error | string | any,
  retryCallback?: () => void
): {
  type: "error" | "warning"
  message: string
  action?: string
  retry?: () => void
} {
  const errorMessage = typeof error === "string" ? error : error?.message || String(error)
  const errorCode = error?.code || ""

  // User rejected transaction/connection
  if (
    errorCode === "ACTION_REJECTED" ||
    errorMessage.toLowerCase().includes("user rejected") ||
    errorMessage.toLowerCase().includes("user denied") ||
    errorMessage.toLowerCase().includes("rejected")
  ) {
    return {
      type: "warning",
      message: "You rejected the wallet action. Try again when ready.",
      action: "Try again",
      retry: retryCallback,
    }
  }

  // Insufficient gas/funds
  if (
    errorMessage.toLowerCase().includes("insufficient funds") ||
    errorMessage.toLowerCase().includes("insufficient balance") ||
    errorMessage.toLowerCase().includes("insufficient gas")
  ) {
    return {
      type: "error",
      message: "Insufficient funds or gas. Please check your wallet balance.",
      action: "Dismiss",
    }
  }

  // Network/RPC errors
  if (
    errorCode === "SERVER_ERROR" ||
    errorMessage.toLowerCase().includes("network error") ||
    errorMessage.toLowerCase().includes("rpc error") ||
    errorMessage.toLowerCase().includes("eth_call") ||
    errorMessage.toLowerCase().includes("timeout")
  ) {
    return {
      type: "error",
      message: "Network issue. Please check your connection and try again.",
      action: "Retry",
      retry: retryCallback,
    }
  }

  // Wrong network
  if (
    errorCode === "NETWORK_MISMATCH" ||
    errorMessage.toLowerCase().includes("wrong chain") ||
    errorMessage.toLowerCase().includes("chainid")
  ) {
    return {
      type: "error",
      message: "Please switch to Avalanche or Base network in your wallet.",
      action: "Dismiss",
    }
  }

  // Contract interaction failed
  if (
    errorMessage.toLowerCase().includes("contract") ||
    errorMessage.toLowerCase().includes("execution reverted")
  ) {
    return {
      type: "error",
      message: "Contract interaction failed. Please try again or contact support.",
      action: "Dismiss",
    }
  }

  // Wallet not connected
  if (
    errorMessage.toLowerCase().includes("not connected") ||
    errorMessage.toLowerCase().includes("no account") ||
    errorMessage.toLowerCase().includes("wallet disconnected")
  ) {
    return {
      type: "warning",
      message: "Wallet not connected. Please connect your wallet.",
      action: "Connect",
    }
  }

  // Generic fallback
  return {
    type: "error",
    message: errorMessage || "An unexpected wallet error occurred. Please try again.",
    action: "Dismiss",
    retry: retryCallback,
  }
}

/**
 * Returns fallback wallet connectors in priority order.
 * Used when Particle auth fails to provide alternative connection methods.
 * 
 * @returns Array of fallback connector configs
 */
export function getFallbackWalletConnectors() {
  return [
    {
      id: "walletconnect",
      name: "WalletConnect",
      description: "Connect via WalletConnect (supports 300+ wallets)",
      logo: "🔗",
      priority: 1,
      chains: ["avalanche", "base"],
    },
    {
      id: "coinbasewallet",
      name: "Coinbase Wallet",
      description: "Connect with Coinbase Wallet",
      logo: "₿",
      priority: 2,
      chains: ["avalanche", "base"],
    },
    {
      id: "metamask",
      name: "MetaMask",
      description: "Connect with MetaMask browser extension",
      logo: "🦊",
      priority: 3,
      chains: ["avalanche", "base"],
    },
  ]
}

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

  return (
    <ParticleWalletContext.Provider
      value={{
        available: true,
        address,
        isConnected: isConnected && !!address,
        openConnectModal: () => setOpen(true),
        disconnect,
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
