"use client"

import { useEffect } from "react"
import { Wallet } from "lucide-react"
import { ArcadeButton } from "@/components/themed/ArcadeButton"
import { ArcadeCard } from "@/components/themed/ArcadeCard"
import { useOptionalDynamicContext } from "@/hooks/useOptionalDynamicContext"

interface StepWalletProps {
  onComplete: (address: string) => void
}

export function StepWallet({ onComplete }: StepWalletProps) {
  const dynamicContext = useOptionalDynamicContext()
  const address = dynamicContext?.primaryWallet?.address

  // Auto-advance if wallet is already connected when this step mounts
  useEffect(() => {
    if (address) {
      // Don't auto-advance — let user confirm with the Continue button
    }
  }, [address])

  if (address) {
    return (
      <ArcadeCard className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <code className="font-mono text-sm text-primary flex-1 truncate">
            {address.slice(0, 6)}...{address.slice(-4)}
          </code>
        </div>
        <p className="font-body text-xs text-muted-foreground">
          Wallet connected. Your identity is forged.
        </p>
        <ArcadeButton
          size="lg"
          className="w-full"
          onClick={() => onComplete(address)}
        >
          Continue →
        </ArcadeButton>
      </ArcadeCard>
    )
  }

  return (
    <ArcadeCard className="space-y-4">
      <p className="font-body text-sm text-muted-foreground">
        Your wallet is your identity on AI(r)Drop. One wallet, one rank — no alts, no bots.
      </p>
      {dynamicContext.available ? (
        <ArcadeButton
          size="lg"
          className="w-full"
          onClick={() => dynamicContext.setShowAuthFlow(true)}
        >
          <Wallet size={16} className="mr-2" />
          Connect Wallet
        </ArcadeButton>
      ) : (
        <div className="space-y-2">
          <ArcadeButton size="lg" className="w-full" disabled>
            <Wallet size={16} className="mr-2" />
            Wallet Unavailable
          </ArcadeButton>
          <p className="font-mono text-[10px] text-muted-foreground/40 text-center">
            Dynamic.xyz provider not configured
          </p>
        </div>
      )}
      <p className="font-mono text-[10px] text-muted-foreground/40 text-center uppercase tracking-widest">
        MetaMask · WalletConnect · Coinbase Wallet
      </p>
    </ArcadeCard>
  )
}
