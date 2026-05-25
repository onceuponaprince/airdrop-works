import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"

const pushMock = vi.fn()
const replaceMock = vi.fn()
const loginMock = vi.fn()
const signInMock = vi.fn()
const applySessionMock = vi.hoisted(() => vi.fn())
const sendOtpMock = vi.hoisted(() => vi.fn())
const verifyOtpAndLoginMock = vi.hoisted(() => vi.fn())
const apiGetMock = vi.hoisted(() => vi.fn())
const apiPostMock = vi.hoisted(() => vi.fn())
const apiSetTokenMock = vi.hoisted(() => vi.fn())

function createLocalStorage() {
  const state: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => state[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      state[key] = String(value)
    }),
    removeItem: vi.fn((key: string) => {
      delete state[key]
    }),
    clear: vi.fn(() => {
      Object.keys(state).forEach((key) => delete state[key])
    }),
  }
}

/** Mirrors S7 post-login routing contract (S7 hook wires this into /login). */
function resolvePostLoginPath(profile: {
  walletAddress?: string | null
  onboardingComplete?: boolean
}): "/dashboard" | "/onboarding" {
  if (!profile.walletAddress && !profile.onboardingComplete) {
    return "/onboarding"
  }
  return "/dashboard"
}

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
    replace: replaceMock,
  }),
  usePathname: () => "/dashboard",
}))

vi.mock("@/hooks/useWeb3Auth", () => ({
  useWeb3Auth: () => ({
    isAuthenticated: false,
    loading: false,
    error: null,
    login: loginMock,
    applySession: applySessionMock,
    user: null,
    logout: vi.fn(),
  }),
}))

vi.mock("@/hooks/useParticleWallet", () => ({
  useParticleWallet: () => ({
    available: false,
    address: undefined,
    isConnected: false,
    openConnectModal: vi.fn(),
    disconnect: vi.fn(),
  }),
}))

vi.mock("@/hooks/useWalletLogin", () => ({
  useWalletLogin: () => ({
    signIn: signInMock,
    isLoggingIn: false,
    error: null,
    canSignIn: false,
  }),
}))

vi.mock("@/hooks/useEmailAuth", () => ({
  useEmailAuth: () => ({
    sendOtp: sendOtpMock,
    verifyOtpAndLogin: verifyOtpAndLoginMock,
    isSubmitting: false,
    error: null,
    setError: vi.fn(),
  }),
}))

vi.mock("@/lib/api", () => ({
  api: {
    get: apiGetMock,
    post: apiPostMock,
    setToken: apiSetTokenMock,
  },
}))

import LoginPage from "@/app/login/page"
import { AuthGuard } from "@/components/shared/AuthGuard"
import { EmailLoginSection } from "@/components/shared/EmailLoginSection"
import { SocialLoginButtons } from "@/components/shared/SocialLoginButtons"
import { consumeSocialLoginCallback } from "@/hooks/useSocialLogin"

describe("wallet login flow", () => {
  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "development")
    pushMock.mockReset()
    replaceMock.mockReset()
    loginMock.mockReset()
    signInMock.mockReset()
    applySessionMock.mockReset()
    sendOtpMock.mockReset()
    verifyOtpAndLoginMock.mockReset()
    apiGetMock.mockReset()
    apiGetMock.mockResolvedValue({})
    apiPostMock.mockReset()
    apiSetTokenMock.mockReset()
    Object.defineProperty(globalThis, "localStorage", {
      value: createLocalStorage(),
      configurable: true,
    })
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("renders the login page with a dev login fallback when Particle is unavailable", async () => {
    render(<LoginPage />)

    expect(screen.getByRole("heading", { name: /log in/i })).toBeTruthy()
    expect(screen.getByRole("button", { name: /dev login/i })).toBeTruthy()

    fireEvent.click(screen.getByRole("button", { name: /dev login/i }))

    await waitFor(() => {
      expect(loginMock).toHaveBeenCalledWith(
        "0x0000000000000000000000000000000000000000",
        "dev-bypass",
        "dev-bypass",
      )
    })
  })

  it("redirects unauthenticated app visits back to /login", async () => {
    render(
      <AuthGuard>
        <div>Protected app content</div>
      </AuthGuard>,
    )

    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith("/login")
    })
    expect(screen.queryByText("Protected app content")).toBeNull()
  })

  it("lets authenticated app content render when auth_token exists", async () => {
    localStorage.setItem("auth_token", "token-123")
    apiGetMock.mockResolvedValue({
      walletAddress: "0x0000000000000000000000000000000000000001",
      onboardingCompleted: true,
    })

    render(
      <AuthGuard>
        <div>Protected app content</div>
      </AuthGuard>,
    )

    await waitFor(() => {
      expect(screen.getByText("Protected app content")).toBeTruthy()
    })
    expect(apiSetTokenMock).toHaveBeenCalledWith("token-123")
    expect(replaceMock).not.toHaveBeenCalled()
  })
})

describe("email OTP login", () => {
  beforeEach(() => {
    sendOtpMock.mockReset()
    verifyOtpAndLoginMock.mockReset()
    applySessionMock.mockReset()
    sendOtpMock.mockResolvedValue(undefined)
    verifyOtpAndLoginMock.mockResolvedValue({
      access: "email-access",
      refresh: "email-refresh",
    })
  })

  it("sends OTP when email is submitted on the login page", async () => {
    render(<EmailLoginSection applySession={applySessionMock} />)

    fireEvent.change(screen.getByPlaceholderText("you@example.com"), {
      target: { value: "qa+otp@example.com" },
    })
    fireEvent.click(screen.getByRole("button", { name: /send verification code/i }))

    await waitFor(() => {
      expect(sendOtpMock).toHaveBeenCalledWith("qa+otp@example.com")
    })
    expect(screen.getByText(/code sent to/i)).toBeTruthy()
  })

  it("verifies OTP and applies Django JWT session", async () => {
    render(<EmailLoginSection applySession={applySessionMock} />)

    fireEvent.change(screen.getByPlaceholderText("you@example.com"), {
      target: { value: "qa+otp@example.com" },
    })
    fireEvent.click(screen.getByRole("button", { name: /send verification code/i }))

    await waitFor(() => {
      expect(screen.getByPlaceholderText("6-digit code")).toBeTruthy()
    })

    fireEvent.change(screen.getByPlaceholderText("6-digit code"), {
      target: { value: "123456" },
    })
    fireEvent.click(screen.getByRole("button", { name: /verify and continue/i }))

    await waitFor(() => {
      expect(verifyOtpAndLoginMock).toHaveBeenCalledWith("qa+otp@example.com", "123456")
    })
  })
})

describe("social login callback parsing", () => {
  const replaceStateMock = vi.fn()

  beforeEach(() => {
    applySessionMock.mockReset()
    replaceStateMock.mockReset()
  })

  it("consumes twitter OAuth return params and applies session", () => {
    Object.defineProperty(window, "location", {
      value: {
        search: "?twitter=login&access=tw-access&refresh=tw-refresh",
        pathname: "/login",
      },
      configurable: true,
    })
    Object.defineProperty(window, "history", {
      value: { replaceState: replaceStateMock },
      configurable: true,
    })

    expect(consumeSocialLoginCallback(applySessionMock)).toBe(true)
    expect(applySessionMock).toHaveBeenCalledWith("tw-access", "tw-refresh")
    expect(replaceStateMock).toHaveBeenCalledWith({}, "", "/login")
  })

  it("consumes discord and github callback params", () => {
    for (const provider of ["discord", "github"] as const) {
      applySessionMock.mockReset()
      replaceStateMock.mockReset()
      Object.defineProperty(window, "location", {
        value: {
          search: `?${provider}=login&access=${provider}-access&refresh=${provider}-refresh`,
          pathname: "/login",
        },
        configurable: true,
      })

      expect(consumeSocialLoginCallback(applySessionMock)).toBe(true)
      expect(applySessionMock).toHaveBeenCalledWith(`${provider}-access`, `${provider}-refresh`)
    }
  })

  it("returns false when callback params are missing", () => {
    Object.defineProperty(window, "location", {
      value: { search: "", pathname: "/login" },
      configurable: true,
    })

    expect(consumeSocialLoginCallback(applySessionMock)).toBe(false)
    expect(applySessionMock).not.toHaveBeenCalled()
  })

  it("runs callback consumption when SocialLoginButtons mounts", () => {
    Object.defineProperty(window, "location", {
      value: {
        search: "?github=login&access=gh-access&refresh=gh-refresh",
        pathname: "/login",
      },
      configurable: true,
    })
    Object.defineProperty(window, "history", {
      value: { replaceState: replaceStateMock },
      configurable: true,
    })

    render(<SocialLoginButtons applySession={applySessionMock} />)

    expect(applySessionMock).toHaveBeenCalledWith("gh-access", "gh-refresh")
  })
})

describe("post-login redirect resolution (S7 contract, mocked)", () => {
  it("routes wallet users to /dashboard", () => {
    expect(
      resolvePostLoginPath({
        walletAddress: "0x0000000000000000000000000000000000000001",
      }),
    ).toBe("/dashboard")
  })

  it("routes social-only users without onboarding to /onboarding", () => {
    expect(resolvePostLoginPath({ walletAddress: null })).toBe("/onboarding")
    expect(resolvePostLoginPath({ walletAddress: "" })).toBe("/onboarding")
  })

  it("routes social-only users who completed onboarding to /dashboard", () => {
    expect(
      resolvePostLoginPath({
        walletAddress: null,
        onboardingComplete: true,
      }),
    ).toBe("/dashboard")
  })
})
