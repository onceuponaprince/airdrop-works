"use client"

/**
 * Root client providers: optional Dynamic.xyz (wallet), wagmi, React Query defaults, and toast UI.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { DynamicContextProvider } from "@dynamic-labs/sdk-react-core"
import { EthereumWalletConnectors } from "@dynamic-labs/ethereum"
import { WagmiProvider, createConfig, http } from "wagmi"
import { avalanche, base } from "wagmi/chains"
import { useState } from "react"
import { Toaster } from "@/components/ui/toaster"

const wagmiConfig = createConfig({
  chains: [avalanche, base],
  transports: {
    [avalanche.id]: http(),
    [base.id]: http(),
  },
})

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
        walletConnectors: [EthereumWalletConnectors],
      }}
    >
      {inner}
    </DynamicContextProvider>
  )
}
