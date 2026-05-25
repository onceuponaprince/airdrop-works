import { beforeEach, describe, expect, it, vi } from "vitest"
import { renderHook, waitFor } from "@testing-library/react"
import { ApiError } from "@/lib/api"

const applySessionMock = vi.fn()
const verifyOtpMock = vi.fn()
const apiPostMock = vi.fn()

vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      verifyOtp: (...args: unknown[]) => verifyOtpMock(...args),
    },
  },
}))

vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>()
  return {
    ...actual,
    api: {
      post: (...args: unknown[]) => apiPostMock(...args),
    },
  }
})

import { useEmailAuth } from "@/hooks/useEmailAuth"

describe("useEmailAuth mergeRequired handling", () => {
  beforeEach(() => {
    applySessionMock.mockReset()
    verifyOtpMock.mockReset()
    apiPostMock.mockReset()
    verifyOtpMock.mockResolvedValue({
      data: { session: { access_token: "supabase-token" } },
      error: null,
    })
  })

  it("shows pending merge state on 409 mergeRequired instead of generic error", async () => {
    apiPostMock.mockRejectedValue(
      new ApiError(409, {
        mergeRequired: true,
        detail: "Confirmation email sent. Check your inbox to link this account.",
      }),
    )

    const { result } = renderHook(() => useEmailAuth(applySessionMock))

    await expect(
      result.current.verifyOtpAndLogin("wallet-user@example.com", "123456"),
    ).resolves.toBeNull()

    await waitFor(() => {
      expect(result.current.mergePending).toEqual({
        email: "wallet-user@example.com",
        detail: "Confirmation email sent. Check your inbox to link this account.",
      })
    })
    expect(result.current.error).toBeNull()
    expect(applySessionMock).not.toHaveBeenCalled()
  })
})
