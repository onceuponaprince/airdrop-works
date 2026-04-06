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
