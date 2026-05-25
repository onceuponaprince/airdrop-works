import { describe, expect, it } from "vitest"
import { needsOnboarding, postAuthPath, type AuthUser } from "@/lib/onboarding"

describe("onboarding routing helpers", () => {
  it("routes social-only incomplete users to /onboarding", () => {
    const user: AuthUser = {
      id: "1",
      walletAddress: null,
      onboardingCompleted: false,
    }

    expect(needsOnboarding(user)).toBe(true)
    expect(postAuthPath(user)).toBe("/onboarding")
  })

  it("skips onboarding for wallet users", () => {
    const user: AuthUser = {
      id: "2",
      walletAddress: "0xabc",
      onboardingCompleted: false,
    }

    expect(needsOnboarding(user)).toBe(false)
    expect(postAuthPath(user)).toBe("/dashboard")
  })

  it("routes completed social users to /dashboard", () => {
    const user: AuthUser = {
      id: "3",
      walletAddress: null,
      onboardingCompleted: true,
    }

    expect(needsOnboarding(user)).toBe(false)
    expect(postAuthPath(user)).toBe("/dashboard")
  })
})
