"use client"

/**
 * Root client providers — wraps the entire app with:
 *
 *   1. **Particle ConnectKitProvider** — wallet connect UI + session
 *      (Avalanche + Base chains, MetaMask/WalletConnect/Coinbase).
 *      Only mounted when NEXT_PUBLIC_PROJECT_ID is set; otherwise
 *      a dev banner warns that wallet features are disabled.
 *   2. **WagmiProvider** — EVM chain config for on-chain reads.
 *   3. **QueryClientProvider** — React Query with 60s stale time and single retry.
 *   4. **Toaster** — Radix-based toast notification outlet.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { WagmiProvider, createConfig as createWagmiConfig, http } from "wagmi"
import { avalanche, base } from "wagmi/chains"
import { useState } from "react"
import { Toaster } from "@/components/ui/toaster"

// Particle Network — lazy loaded to avoid SSR issues
let ParticleProvider: React.ComponentType<{ children: React.ReactNode }> | null = null

const particleProjectId = (process.env.NEXT_PUBLIC_PROJECT_ID ?? "").trim()
const particleClientKey = (process.env.NEXT_PUBLIC_CLIENT_KEY ?? "").trim()
const particleAppId = (process.env.NEXT_PUBLIC_APP_ID ?? "").trim()
const hasParticle = particleProjectId.length > 0 && particleClientKey.length > 0 && particleAppId.length > 0

if (hasParticle && typeof window !== "undefined") {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { ConnectKitProvider, createConfig } = require("@particle-network/connectkit")
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { evmWalletConnectors } = require("@particle-network/connectkit/evmWalletConnectors")

    const particleConfig = createConfig({
      projectId: particleProjectId,
      clientKey: particleClientKey,
      appId: particleAppId,
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
        mode: "dark" as const,
        recommendedWallets: [
          { walletId: "metaMask", label: "Recommended" },
        ],
      },
    })

    ParticleProvider = function ParticleProviderWrapper({ children }: { children: React.ReactNode }) {
      return <ConnectKitProvider config={particleConfig}>{children}</ConnectKitProvider>
    }
  } catch (e) {
    console.warn("[Providers] Failed to initialize Particle ConnectKit:", e)
  }
}

// Wagmi config — used for on-chain reads independently of Particle
const wagmiConfig = createWagmiConfig({
  chains: [avalanche, base],
  transports: {
    [avalanche.id]: http(),
    [base.id]: http(),
  },
})

/** Wraps the app with Wagmi + QueryClient; adds Particle when env vars are set. */
export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            retry: 1,
          },
        },
      })
  )

  const inner = (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        {children}
        <Toaster />
      </QueryClientProvider>
    </WagmiProvider>
  )

  if (!hasParticle || !ParticleProvider) {
    return (
      <>
        {inner}
        {process.env.NODE_ENV === "development" ? (
          <div
            role="status"
            className="fixed bottom-0 left-0 right-0 z-[100] border-t border-amber-500/40 bg-amber-950/95 px-4 py-2.5 text-center text-sm text-amber-50 shadow-lg backdrop-blur-sm"
          >
            Particle wallet is off: set{" "}
            <code className="rounded bg-black/35 px-1.5 py-0.5 font-mono text-xs">
              NEXT_PUBLIC_PROJECT_ID
            </code>
            ,{" "}
            <code className="rounded bg-black/35 px-1.5 py-0.5 font-mono text-xs">
              NEXT_PUBLIC_CLIENT_KEY
            </code>
            , and{" "}
            <code className="rounded bg-black/35 px-1.5 py-0.5 font-mono text-xs">
              NEXT_PUBLIC_APP_ID
            </code>{" "}
            in{" "}
            <code className="rounded bg-black/35 px-1.5 py-0.5 font-mono text-xs">
              .env
            </code>{" "}
            (from the Particle dashboard) to enable wallet connect.
          </div>
        ) : null}
      </>
    )
  }

  return <ParticleProvider>{inner}</ParticleProvider>
}
