import { describe, expect, it } from "vitest"
import { needsOnboarding, postAuthPath } from "@/lib/onboarding"

describe("onboarding", () => {
  it("postAuthPath routes wallet users to dashboard", () => {
    expect(
      postAuthPath({ id: "1", walletAddress: "0x0000000000000000000000000000000000000001" }),
    ).toBe("/dashboard")
  })

  it("postAuthPath routes social-only users without onboarding to onboarding", () => {
    expect(
      postAuthPath({ id: "1", email: "user@example.com", onboardingCompleted: false }),
    ).toBe("/onboarding")
    expect(postAuthPath({ id: "1", walletAddress: null, onboardingCompleted: false })).toBe(
      "/onboarding",
    )
  })

  it("postAuthPath routes social users who completed onboarding to dashboard", () => {
    expect(postAuthPath({ id: "1", email: "user@example.com", onboardingCompleted: true })).toBe(
      "/dashboard",
    )
  })

  it("needsOnboarding is false when user is missing or has a wallet", () => {
    expect(needsOnboarding(null)).toBe(false)
    expect(needsOnboarding({ id: "1", walletAddress: "0x1" })).toBe(false)
  })

  it("needsOnboarding is true for wallet-less users who have not completed onboarding", () => {
    expect(needsOnboarding({ id: "1", onboardingCompleted: false })).toBe(true)
  })
})
