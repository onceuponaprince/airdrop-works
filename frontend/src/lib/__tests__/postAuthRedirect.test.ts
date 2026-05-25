import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  consumePostAuthDestination,
  hasCompletedOnboarding,
  markOnboardingComplete,
  resolvePostAuthDestination,
  setPostAuthDestination,
} from "@/lib/postAuthRedirect"

function createStorage() {
  const state: Record<string, string> = {}
  return {
    getItem: (key: string) => state[key] ?? null,
    setItem: (key: string, value: string) => {
      state[key] = String(value)
    },
    removeItem: (key: string) => {
      delete state[key]
    },
    clear: () => {
      Object.keys(state).forEach((key) => delete state[key])
    },
  }
}

describe("postAuthRedirect", () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, "sessionStorage", {
      value: createStorage(),
      configurable: true,
    })
    Object.defineProperty(globalThis, "localStorage", {
      value: createStorage(),
      configurable: true,
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("routes wallet auth to dashboard", () => {
    expect(resolvePostAuthDestination({ authMethod: "wallet" })).toBe("/dashboard")
  })

  it("routes new social users to onboarding", () => {
    expect(
      resolvePostAuthDestination({ authMethod: "social", created: true }),
    ).toBe("/onboarding")
  })

  it("routes wallet-less returning users to onboarding until skipped", () => {
    expect(
      resolvePostAuthDestination({ authMethod: "email", walletAddress: null }),
    ).toBe("/onboarding")
  })

  it("routes to dashboard after onboarding is marked complete", () => {
    markOnboardingComplete()
    expect(hasCompletedOnboarding()).toBe(true)
    expect(
      resolvePostAuthDestination({ authMethod: "email", walletAddress: null }),
    ).toBe("/dashboard")
  })

  it("consumes session-stored destination once", () => {
    setPostAuthDestination("/onboarding")
    expect(consumePostAuthDestination()).toBe("/onboarding")
    expect(consumePostAuthDestination()).toBeNull()
  })
})
