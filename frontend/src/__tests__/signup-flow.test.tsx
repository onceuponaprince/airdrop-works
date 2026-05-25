import { beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"

const pushMock = vi.fn()
const applySessionMock = vi.hoisted(() => vi.fn())
const checkWhitelistMock = vi.hoisted(() => vi.fn())

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock, replace: vi.fn() }),
  usePathname: () => "/signup",
  useSearchParams: () => new URLSearchParams(),
}))

vi.mock("@/hooks/useWeb3Auth", () => ({
  useWeb3Auth: () => ({
    isAuthenticated: false,
    loading: false,
    error: null,
    applySession: applySessionMock,
    user: null,
    login: vi.fn(),
    logout: vi.fn(),
  }),
}))

vi.mock("@/hooks/useWalletLogin", () => ({
  useWalletLogin: () => ({
    signIn: vi.fn(),
    isLoggingIn: false,
    error: null,
    canSignIn: false,
  }),
}))

vi.mock("@/hooks/useEmailAuth", () => ({
  useEmailAuth: () => ({
    sendOtp: vi.fn(),
    verifyOtpAndLogin: vi.fn(),
    isSubmitting: false,
    error: null,
    setError: vi.fn(),
    mergePending: null,
    clearMergePending: vi.fn(),
  }),
}))

vi.mock("@/hooks/useSocialLogin", () => ({
  useSocialLogin: () => ({
    loginWith: vi.fn(),
    loadingProvider: null,
    error: null,
  }),
  consumeSocialLoginCallback: vi.fn(() => false),
}))

vi.mock("@/lib/supabase", () => ({
  checkWhitelistApproval: checkWhitelistMock,
}))

import SignupPage from "@/app/signup/page"

describe("approved signup flow", () => {
  beforeEach(() => {
    pushMock.mockReset()
    applySessionMock.mockReset()
    checkWhitelistMock.mockReset()
    vi.stubEnv("NODE_ENV", "test")
  })

  it("starts on waitlist email verification", () => {
    render(<SignupPage />)
    expect(screen.getByRole("heading", { name: /sign up/i })).toBeTruthy()
    expect(screen.getByRole("button", { name: /verify whitelist status/i })).toBeTruthy()
    expect(screen.queryByText(/or social/i)).toBeNull()
  })

  it("shows email, social, and wallet paths after whitelist approval", async () => {
    checkWhitelistMock.mockResolvedValue({
      exists: true,
      approved: true,
      rank: 12,
    })

    render(<SignupPage />)

    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: "approved@example.com" },
    })
    fireEvent.click(screen.getByRole("button", { name: /verify whitelist status/i }))

    await waitFor(() => {
      expect(screen.getByText(/email approved/i)).toBeTruthy()
    })

    expect(screen.getByText(/^or social$/i)).toBeTruthy()
    expect(screen.getByRole("button", { name: /continue with github/i })).toBeTruthy()
    expect(screen.getByRole("button", { name: /send verification code/i })).toBeTruthy()
    expect(screen.getByPlaceholderText("you@example.com")).toHaveProperty(
      "value",
      "approved@example.com",
    )
  })

  it("blocks auth step when email is not approved", async () => {
    checkWhitelistMock.mockResolvedValue({
      exists: true,
      approved: false,
      rank: 99,
    })

    render(<SignupPage />)

    fireEvent.change(screen.getByLabelText(/email address/i), {
      target: { value: "pending@example.com" },
    })
    fireEvent.click(screen.getByRole("button", { name: /verify whitelist status/i }))

    await waitFor(() => {
      expect(screen.getByText(/pending approval/i)).toBeTruthy()
    })

    expect(screen.queryByText(/or social/i)).toBeNull()
  })
})
