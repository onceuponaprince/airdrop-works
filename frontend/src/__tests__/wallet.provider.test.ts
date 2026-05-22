import { describe, it, expect, vi, beforeAll } from "vitest"
import type { ReactNode } from "react"
import type {
  getFallbackWalletConnectors as getFallbackWalletConnectorsFn,
  handleWalletError as handleWalletErrorFn,
} from "@/providers/walletUtils"

let handleWalletError: typeof handleWalletErrorFn
let getFallbackWalletConnectors: typeof getFallbackWalletConnectorsFn

beforeAll(async () => {
  // Mock localStorage before importing ParticleProvider to avoid module-level
  // side-effects from connectkit that access window.localStorage at import time.
  Object.defineProperty(globalThis, "localStorage", {
    value: {
      getItem: (_: string) => null,
      setItem: (_: string, __: string) => undefined,
      removeItem: (_: string) => undefined,
      clear: () => undefined,
    },
    configurable: true,
  })

  // Mock Particle Network modules that perform environment-specific IO at import
  // time so tests can import the provider endpoints without loading native
  // binaries or browser-only APIs.
  Object.defineProperty(globalThis, "vi", {
    value: vi,
    configurable: true,
  })
  vi.mock("@particle-network/connectkit", () => {
    return {
      createConfig: () => ({}),
      ConnectKitProvider: ({ children }: { children: ReactNode }) => children,
      useAccount: () => ({ address: null, isConnected: false }),
      useDisconnect: () => ({ disconnect: () => {} }),
      useModal: () => ({ setOpen: () => {} }),
    }
  })
  vi.mock("@particle-network/connectkit/evm", () => ({ evmWalletConnectors: () => [] }))

  const mod = await import("@/providers/ParticleProvider")
  handleWalletError = mod.handleWalletError
  getFallbackWalletConnectors = mod.getFallbackWalletConnectors
})

describe("Wallet Provider Functions", () => {
  describe("handleWalletError()", () => {
    it("should map user-rejected errors to warning type", () => {
      const error = { message: "user rejected", code: "ACTION_REJECTED" }
      const result = handleWalletError(error)

      expect(result.type).toBe("warning")
      expect(result.message).toContain("rejected the wallet action")
      expect(result.action).toBe("Try again")
    })

    it("should handle rejection with different case variations", () => {
      const variants = [
        "User rejected the transaction",
        "USER DENIED the action",
        "Transaction rejected",
      ]

      variants.forEach((msg) => {
        const result = handleWalletError({ message: msg })
        expect(result.type).toBe("warning")
        expect(result.action).toBe("Try again")
      })
    })

    it("should handle insufficient funds errors", () => {
      const errors = [
        { message: "insufficient funds for gas" },
        { message: "Insufficient balance" },
        { message: "Insufficient Gas" },
      ]

      errors.forEach((error) => {
        const result = handleWalletError(error)
        expect(result.type).toBe("error")
        expect(result.message).toContain("Insufficient funds")
      })
    })

    it("should handle network/RPC errors", () => {
      const errors = [
        { message: "Network error occurred", code: "SERVER_ERROR" },
        { message: "RPC error: eth_call failed" },
        { message: "Request timeout" },
      ]

      errors.forEach((error) => {
        const result = handleWalletError(error)
        expect(result.type).toBe("error")
        expect(result.message).toContain("Network")
        expect(result.action).toBe("Retry")
      })
    })

    it("should handle network mismatch errors", () => {
      const errors = [
        { message: "wrong chain", code: "NETWORK_MISMATCH" },
        { message: "ChainId mismatch" },
      ]

      errors.forEach((error) => {
        const result = handleWalletError(error)
        expect(result.type).toBe("error")
        expect(result.message).toContain("Avalanche or Base network")
      })
    })

    it("should handle contract interaction errors", () => {
      const errors = [
        { message: "contract execution reverted" },
        { message: "Contract call failed" },
      ]

      errors.forEach((error) => {
        const result = handleWalletError(error)
        expect(result.type).toBe("error")
        expect(result.message).toContain("Contract interaction failed")
      })
    })

    it("should handle wallet disconnection errors", () => {
      const errors = [
        { message: "wallet not connected" },
        { message: "No account available" },
        { message: "Wallet disconnected" },
      ]

      errors.forEach((error) => {
        const result = handleWalletError(error)
        expect(result.type).toBe("warning")
        expect(result.message).toContain("not connected")
      })
    })

    it("should handle string errors directly", () => {
      const result = handleWalletError("Connection failed")
      expect(result.type).toBe("error")
      expect(result.message).toContain("Connection failed")
    })

    it("should handle unknown error objects", () => {
      const result = handleWalletError(new Error("Custom error"))
      expect(result.type).toBe("error")
      expect(result.message).toContain("Custom error")
    })

    it("should include retry callback when provided", () => {
      const retryFn = vi.fn()
      const error = { message: "Network error" }
      const result = handleWalletError(error, retryFn)

      expect(result.retry).toBe(retryFn)
      result.retry?.()
      expect(retryFn).toHaveBeenCalled()
    })

    it("should provide default fallback for unknown errors", () => {
      const result = handleWalletError({
        message: "Some random error code XYZ",
      })
      expect(result.type).toBe("error")
      expect(result.action).toBe("Dismiss")
    })

    it("should handle null error gracefully", () => {
      const result = handleWalletError(null)
      expect(result.type).toBe("error")
      expect(result.message).toContain("unexpected wallet error")
    })
  })

  describe("getFallbackWalletConnectors()", () => {
    it("should return an array of fallback connectors", () => {
      const connectors = getFallbackWalletConnectors()
      expect(Array.isArray(connectors)).toBe(true)
      expect(connectors.length).toBeGreaterThan(0)
    })

    it("should include WalletConnect as first priority", () => {
      const connectors = getFallbackWalletConnectors()
      const walletConnect = connectors.find((c) => c.id === "walletconnect")

      expect(walletConnect).toBeDefined()
      expect(walletConnect?.priority).toBe(1)
      expect(walletConnect?.name).toBe("WalletConnect")
    })

    it("should include Coinbase Wallet as second priority", () => {
      const connectors = getFallbackWalletConnectors()
      const coinbase = connectors.find((c) => c.id === "coinbasewallet")

      expect(coinbase).toBeDefined()
      expect(coinbase?.priority).toBe(2)
      expect(coinbase?.name).toBe("Coinbase Wallet")
    })

    it("should include MetaMask as third priority", () => {
      const connectors = getFallbackWalletConnectors()
      const metamask = connectors.find((c) => c.id === "metamask")

      expect(metamask).toBeDefined()
      expect(metamask?.priority).toBe(3)
      expect(metamask?.name).toBe("MetaMask")
    })

    it("should order connectors by priority", () => {
      const connectors = getFallbackWalletConnectors()
      const priorities = connectors.map((c) => c.priority)

      expect(priorities).toEqual([1, 2, 3])
    })

    it("should include descriptions for all connectors", () => {
      const connectors = getFallbackWalletConnectors()

      connectors.forEach((connector) => {
        expect(connector.description).toBeDefined()
        expect(connector.description.length).toBeGreaterThan(0)
      })
    })

    it("should include logos for all connectors", () => {
      const connectors = getFallbackWalletConnectors()

      connectors.forEach((connector) => {
        expect(connector.logo).toBeDefined()
        expect(typeof connector.logo).toBe("string")
      })
    })

    it("should support Avalanche and Base chains for all connectors", () => {
      const connectors = getFallbackWalletConnectors()

      connectors.forEach((connector) => {
        expect(connector.chains).toContain("avalanche")
        expect(connector.chains).toContain("base")
      })
    })

    it("should have required properties on each connector", () => {
      const connectors = getFallbackWalletConnectors()

      connectors.forEach((connector) => {
        expect(connector).toHaveProperty("id")
        expect(connector).toHaveProperty("name")
        expect(connector).toHaveProperty("description")
        expect(connector).toHaveProperty("logo")
        expect(connector).toHaveProperty("priority")
        expect(connector).toHaveProperty("chains")
      })
    })

    it("should return consistent results on multiple calls", () => {
      const first = getFallbackWalletConnectors()
      const second = getFallbackWalletConnectors()

      expect(first).toEqual(second)
    })

    it("should provide WalletConnect with 300+ wallet support note", () => {
      const connectors = getFallbackWalletConnectors()
      const walletConnect = connectors.find((c) => c.id === "walletconnect")

      expect(walletConnect?.description).toContain("300+")
    })
  })
})
