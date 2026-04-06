"use client"

/**
 * Root client providers — wraps the entire app with:
 *
 *   1. **Particle ConnectKitProvider** — wallet connect UI + session
 *      (Avalanche + Base chains, MetaMask/WalletConnect/Coinbase).
 *      Only mounted when NEXT_PUBLIC_PROJECT_ID is set.
 *   2. **WagmiProvider** — EVM chain config for on-chain reads.
 *   3. **QueryClientProvider** — React Query with 60s stale time and single retry.
 *   4. **Toaster** — Radix-based toast notification outlet.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { WagmiProvider, createConfig as createWagmiConfig, http } from "wagmi"
import { avalanche, base } from "wagmi/chains"
import { useState } from "react"
import { Toaster } from "@/components/ui/toaster"
import { ParticleProviderWrapper } from "@/providers/ParticleProvider"

// Wagmi config — used for on-chain reads independently of Particle
const wagmiConfig = createWagmiConfig({
  chains: [avalanche, base],
  transports: {
    [avalanche.id]: http(),
    [base.id]: http(),
  },
})

const hasParticleEnv =
  (process.env.NEXT_PUBLIC_PROJECT_ID ?? "").trim().length > 0 &&
  (process.env.NEXT_PUBLIC_CLIENT_KEY ?? "").trim().length > 0 &&
  (process.env.NEXT_PUBLIC_APP_ID ?? "").trim().length > 0

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

  if (!hasParticleEnv) {
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
              .env.local
            </code>{" "}
            then <strong>restart the dev server</strong>.
          </div>
        ) : null}
      </>
    )
  }

  return (
    <ParticleProviderWrapper>{inner}</ParticleProviderWrapper>
  )
}
