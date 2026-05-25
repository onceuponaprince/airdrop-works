import { describe, expect, it, vi } from "vitest"
import {
  consumeMergeConfirmedCallback,
  mergeErrorMessage,
  parseLoginMergeParams,
} from "@/lib/loginMergeParams"

describe("parseLoginMergeParams", () => {
  it("returns null when merge param is absent", () => {
    expect(parseLoginMergeParams("?next=%2Fdashboard")).toBeNull()
  })

  it("parses merge=confirmed with tokens", () => {
    expect(
      parseLoginMergeParams("?merge=confirmed&access=acc&refresh=ref"),
    ).toEqual({
      status: "confirmed",
      access: "acc",
      refresh: "ref",
    })
  })

  it("parses merge=pending with email", () => {
    expect(parseLoginMergeParams("?merge=pending&email=user%40example.com")).toEqual({
      status: "pending",
      email: "user@example.com",
    })
  })

  it("parses merge=error with reason", () => {
    expect(parseLoginMergeParams("?merge=error&reason=invalid_token")).toEqual({
      status: "error",
      reason: "invalid_token",
    })
  })
})

describe("mergeErrorMessage", () => {
  it("maps known reasons to user-facing copy", () => {
    expect(mergeErrorMessage("invalid_token")).toMatch(/invalid or has expired/i)
  })

  it("falls back when reason is unknown", () => {
    expect(mergeErrorMessage("unknown")).toMatch(/missing a token/i)
  })
})

describe("consumeMergeConfirmedCallback", () => {
  it("applies session and cleans the URL", () => {
    const applySession = vi.fn()
    Object.defineProperty(window, "location", {
      value: {
        search: "?merge=confirmed&access=acc&refresh=ref",
        pathname: "/login",
      },
      configurable: true,
    })
    const replaceState = vi.fn()
    Object.defineProperty(window, "history", {
      value: { replaceState },
      configurable: true,
    })

    expect(consumeMergeConfirmedCallback(applySession)).toBe(true)
    expect(applySession).toHaveBeenCalledWith("acc", "ref")
    expect(replaceState).toHaveBeenCalledWith({}, "", "/login")
  })

  it("returns false without access token", () => {
    const applySession = vi.fn()
    Object.defineProperty(window, "location", {
      value: { search: "?merge=confirmed", pathname: "/login" },
      configurable: true,
    })

    expect(consumeMergeConfirmedCallback(applySession)).toBe(false)
    expect(applySession).not.toHaveBeenCalled()
  })
})
