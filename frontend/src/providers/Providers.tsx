"use client"

/**
 * Root client providers — wraps the entire app with:
 *
 *   1. **WagmiProvider** — EVM chain config (Avalanche + Base) for on-chain reads.
 *   2. **QueryClientProvider** — React Query with 60s stale time and single retry.
 *   3. **DynamicContextProvider** (conditional) — wallet connect UI + session.
 *      Only mounted when NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID is set; otherwise
 *      a dev banner warns that wallet features are disabled.
 *   4. **Toaster** — Radix-based toast notification outlet.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { DynamicContextProvider } from "@dynamic-labs/sdk-react-core"
import { EthereumWalletConnectors } from "@dynamic-labs/ethereum"
import { SolanaWalletConnectors } from "@dynamic-labs/solana"
import { WagmiProvider, createConfig, http } from "wagmi"
import { avalanche, base } from "wagmi/chains"
import { useState } from "react"
import { Toaster } from "@/components/ui/toaster"

// Wagmi needs a static config — created once outside the component to
// avoid re-creating on every render.
const wagmiConfig = createConfig({
  chains: [avalanche, base],
  transports: {
    [avalanche.id]: http(),
    [base.id]: http(),
  },
})

// Dynamic.xyz is optional — the app works without it (just no wallet connect).
// This lets contributors run the frontend locally without a Dynamic account.
const dynamicEnvironmentId = (
  process.env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID ?? ""
).trim()

const hasDynamicEnvironment = dynamicEnvironmentId.length > 0

/** Wraps the app with Wagmi + QueryClient; adds Dynamic when `NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID` is set. */
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

  if (!hasDynamicEnvironment) {
    return (
      <>
        {inner}
        {process.env.NODE_ENV === "development" ? (
          <div
            role="status"
            className="fixed bottom-0 left-0 right-0 z-[100] border-t border-amber-500/40 bg-amber-950/95 px-4 py-2.5 text-center text-sm text-amber-50 shadow-lg backdrop-blur-sm"
          >
            Dynamic.xyz is off: set{" "}
            <code className="rounded bg-black/35 px-1.5 py-0.5 font-mono text-xs">
              NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID
            </code>{" "}
            in{" "}
            <code className="rounded bg-black/35 px-1.5 py-0.5 font-mono text-xs">
              .env
            </code>{" "}
            (from the Dynamic dashboard) to enable wallet connect and remove SDK
            network errors.
          </div>
        ) : null}
      </>
    )
  }

  return (
    <DynamicContextProvider
      settings={{
        environmentId: dynamicEnvironmentId,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        walletConnectors: [EthereumWalletConnectors, SolanaWalletConnectors] as any,
      }}
    >
      {inner}
    </DynamicContextProvider>
  )
}
