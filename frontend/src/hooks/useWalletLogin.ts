"use client"

import { useCallback, useState } from "react"
import { useAccount, useChainId, useSignMessage } from "wagmi"
import { buildSiweMessage } from "@/lib/siwe"
import { useWeb3Auth } from "@/hooks/useWeb3Auth"
import { events } from "@/lib/analytics"
import { setPostAuthDestination } from "@/lib/postAuthRedirect"

/**
 * Connect wallet → sign SIWE message → exchange for Django JWT.
 */
export function useWalletLogin() {
  const { address, isConnected } = useAccount()
  const chainId = useChainId()
  const { signMessageAsync } = useSignMessage()
  const { login } = useWeb3Auth()
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const signIn = useCallback(async () => {
    if (!address || !isConnected) {
      throw new Error("Connect your wallet first.")
    }

    setIsLoggingIn(true)
    setError(null)

    try {
      const domain = typeof window !== "undefined" ? window.location.host : "airdrop.works"
      const uri = typeof window !== "undefined" ? window.location.origin : "https://airdrop.works"
      const message = buildSiweMessage({
        domain,
        address,
        uri,
        chainId: chainId || 43114,
      })

      let signature: string
      try {
        signature = await signMessageAsync({ message })
      } catch (signErr) {
        const msg = signErr instanceof Error ? signErr.message : "Signature rejected"
        throw new Error(msg.includes("reject") ? "You rejected the signature request." : msg)
      }

      await login(address, message, signature)
      setPostAuthDestination("/dashboard")
      events.walletAuthSuccess(address)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Authentication failed"
      setError(message)
      events.walletAuthFail(message)
      throw err
    } finally {
      setIsLoggingIn(false)
    }
  }, [address, isConnected, chainId, signMessageAsync, login])

  return { signIn, isLoggingIn, error, canSignIn: Boolean(address && isConnected) }
}
