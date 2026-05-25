import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  buildAccountScoreLoginUrl,
  canShowAccountScore,
  isAuthenticatedForAccountScore,
  JUDGE_DEMO_TRIED_KEY,
  markJudgeDemoTried,
  markWaitlistJoined,
  WAITLIST_JOINED_KEY,
} from "@/lib/canShowAccountScore"

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

describe("canShowAccountScore", () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, "localStorage", {
      value: createStorage(),
      configurable: true,
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("is hidden until waitlist or demo unlock", () => {
    expect(canShowAccountScore()).toBe(false)
    markJudgeDemoTried()
    expect(canShowAccountScore()).toBe(true)
    localStorage.removeItem(JUDGE_DEMO_TRIED_KEY)
    markWaitlistJoined()
    expect(canShowAccountScore()).toBe(true)
    expect(localStorage.getItem(WAITLIST_JOINED_KEY)).toBe("1")
  })

  it("detects auth token for account score", () => {
    expect(isAuthenticatedForAccountScore()).toBe(false)
    localStorage.setItem("auth_token", "jwt-abc")
    expect(isAuthenticatedForAccountScore()).toBe(true)
  })

  it("builds login redirect with next and message", () => {
    expect(buildAccountScoreLoginUrl("/#twitter-analyzer")).toBe(
      "/login?next=%2F%23twitter-analyzer&message=account-score",
    )
  })
})
