import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"

const pushMock = vi.fn()
const replaceMock = vi.fn()
const loginMock = vi.fn()
const signInMock = vi.fn()
const apiGetMock = vi.hoisted(() => vi.fn())
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

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: pushMock,
    replace: replaceMock,
  }),
}))

vi.mock("@/hooks/useWeb3Auth", () => ({
  useWeb3Auth: () => ({
    isAuthenticated: false,
    loading: false,
    error: null,
    user: null,
    login: loginMock,
    applySession: vi.fn(),
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

vi.mock("@/components/shared/EmailLoginSection", () => ({
  EmailLoginSection: () => <div data-testid="email-login-section" />,
}))

vi.mock("@/components/shared/SocialLoginButtons", () => ({
  SocialLoginButtons: () => <div data-testid="social-login-buttons" />,
}))

vi.mock("@/components/themed/CrtOverlay", () => ({
  CrtOverlay: ({ children }: { children?: ReactNode }) => <>{children}</>,
}))

vi.mock("@/lib/api", () => ({
  api: {
    get: apiGetMock,
    setToken: apiSetTokenMock,
  },
}))

import LoginPage from "@/app/login/page"
import { AuthGuard } from "@/components/shared/AuthGuard"

describe("wallet login flow", () => {
  beforeEach(() => {
    vi.stubEnv("NODE_ENV", "development")
    pushMock.mockReset()
    replaceMock.mockReset()
    loginMock.mockReset()
    signInMock.mockReset()
    apiGetMock.mockReset()
    apiGetMock.mockResolvedValue({})
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
    expect(screen.getByTestId("email-login-section")).toBeTruthy()
    expect(screen.getByTestId("social-login-buttons")).toBeTruthy()
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
