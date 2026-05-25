import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

function response(status: number, data: unknown, ok = status >= 200 && status < 300) {
  return {
    ok,
    status,
    statusText: status === 200 ? "OK" : "Error",
    json: vi.fn().mockResolvedValue(data),
  }
}

function createStorage(initial: Record<string, string> = {}) {
  const state = { ...initial }
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

async function loadApi(storage = createStorage()) {
  vi.resetModules()
  Object.defineProperty(window, "localStorage", {
    value: storage,
    configurable: true,
  })
  const mod = await import("@/lib/api")
  return { ...mod, storage }
}

describe("API client route contracts", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.resetModules()
  })

  it("sends authenticated GET requests to /api/v1 routes", async () => {
    const fetchMock = vi.mocked(fetch)
    fetchMock.mockResolvedValueOnce(response(200, { walletAddress: "0xabc" }) as Response)

    const { api } = await loadApi()
    api.setToken("access-token")

    await api.get("/auth/me/")

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/auth/me/",
      expect.objectContaining({
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          Authorization: "Bearer access-token",
        }),
      }),
    )
  })

  it("serializes POST bodies for wallet verification", async () => {
    const fetchMock = vi.mocked(fetch)
    fetchMock.mockResolvedValueOnce(response(200, { access: "a", refresh: "r" }) as Response)

    const { api } = await loadApi()
    const payload = {
      wallet_address: "0x0000000000000000000000000000000000000001",
      message: "dev-bypass",
      signature: "dev-bypass",
    }

    await api.post("/auth/wallet-verify/", payload)

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/auth/wallet-verify/",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(payload),
      }),
    )
  })

  it("refreshes expired tokens once and retries the original route", async () => {
    const storage = createStorage({
      auth_token: "expired-token",
      refresh_token: "refresh-token",
      spore_active_tenant: "tenant-a",
    })
    const fetchMock = vi.mocked(fetch)
    fetchMock
      .mockResolvedValueOnce(response(401, { detail: "expired" }, false) as Response)
      .mockResolvedValueOnce(response(200, { access: "new-access" }) as Response)
      .mockResolvedValueOnce(response(200, { results: [] }) as Response)

    const { api } = await loadApi(storage)

    await api.get("/contributions/")

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      "/api/v1/contributions/",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer expired-token",
          "X-SPORE-TENANT": "tenant-a",
        }),
      }),
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      "/api/v1/auth/token/refresh/",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ refresh: "refresh-token" }),
      }),
    )
    expect(fetchMock).toHaveBeenNthCalledWith(
      3,
      "/api/v1/contributions/",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer new-access",
          "X-SPORE-TENANT": "tenant-a",
        }),
      }),
    )
    expect(storage.setItem).toHaveBeenCalledWith("auth_token", "new-access")
  })
})
