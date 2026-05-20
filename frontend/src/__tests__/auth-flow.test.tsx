import { beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"

const pushMock = vi.fn()
const replaceMock = vi.fn()
const loginMock = vi.fn()
const originalNodeEnv = process.env.NODE_ENV

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
    login: loginMock,
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

import LoginPage from "@/app/login/page"
import { AuthGuard } from "@/components/shared/AuthGuard"

describe("wallet login flow", () => {
  beforeEach(() => {
    process.env.NODE_ENV = "development"
    pushMock.mockReset()
    replaceMock.mockReset()
    loginMock.mockReset()
    Object.defineProperty(globalThis, "localStorage", {
      value: createLocalStorage(),
      configurable: true,
    })
  })

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv
  })

  it("renders the login page with a dev login fallback when Particle is unavailable", async () => {
    render(<LoginPage />)

    expect(screen.getByRole("heading", { name: "Login" })).toBeTruthy()
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

  it("lets authenticated app content render when auth_token exists", () => {
    localStorage.setItem("auth_token", "token-123")

    render(
      <AuthGuard>
        <div>Protected app content</div>
      </AuthGuard>,
    )

    expect(screen.getByText("Protected app content")).toBeTruthy()
    expect(replaceMock).not.toHaveBeenCalled()
  })
})