/**
 * Typed HTTP client for the Django REST API.
 * All requests go to /api/v1/* on the same origin — Next.js rewrites
 * proxy them to the Django backend, eliminating CORS entirely.
 *
 * Handles Bearer auth, optional Spore tenant header, and one
 * automatic token refresh on 401.
 */

const BASE_URL = "/api/v1"

/** Thrown when the API returns a non-2xx response; carries `status` and parsed `data`. */
class ApiError extends Error {
  constructor(
    public status: number,
    public data: unknown
  ) {
    super(`API Error ${status}`)
    this.name = "ApiError"
  }
}

/**
 * Singleton-style client: `request` attaches JWT and retries once after `tryRefreshToken` if the server returns 401.
 * Refresh is deduped via `refreshPromise` so concurrent calls share one token refresh.
 */
class ApiClient {
  private accessToken: string | null = null
  private refreshPromise: Promise<string | null> | null = null

  /** Updates in-memory Bearer token (used together with localStorage hydration). */
  setToken(token: string | null) {
    this.accessToken = token
  }

  /**
   * Hydrate from localStorage on first use in a browser context.
   * Call this once at app startup (e.g. from providers or layout).
   */
  hydrateFromStorage() {
    if (typeof window === "undefined") return
    this.accessToken = localStorage.getItem("auth_token")
  }

  /**
   * Attempt to swap the refresh token for a new access token.
   *
   * Deduplication: if multiple requests 401 at the same time, they all
   * await the same `refreshPromise` rather than firing N refresh calls.
   * The promise is cleared in `finally` so the next 401 can start fresh.
   */
  private async tryRefreshToken(): Promise<string | null> {
    if (typeof window === "undefined") return null
    const refresh = localStorage.getItem("refresh_token")
    if (!refresh) return null

    // Return the in-flight refresh if one is already running
    if (this.refreshPromise) return this.refreshPromise

    this.refreshPromise = (async () => {
      try {
        const res = await fetch(`${BASE_URL}/auth/token/refresh/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh }),
        })

        if (!res.ok) {
          localStorage.removeItem("auth_token")
          localStorage.removeItem("refresh_token")
          return null
        }

        const data = await res.json()
        const newAccess = data.access as string
        localStorage.setItem("auth_token", newAccess)
        if (data.refresh) localStorage.setItem("refresh_token", data.refresh)
        this.accessToken = newAccess
        return newAccess
      } catch {
        return null
      } finally {
        this.refreshPromise = null
      }
    })()

    return this.refreshPromise
  }

  private async request<T>(
    path: string,
    options: RequestInit = {},
    isRetry = false
  ): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    }

    if (this.accessToken) {
      headers["Authorization"] = `Bearer ${this.accessToken}`
    }

    if (typeof window !== "undefined") {
      const activeTenant = window.localStorage.getItem("spore_active_tenant")
      if (activeTenant && !headers["X-SPORE-TENANT"]) {
        headers["X-SPORE-TENANT"] = activeTenant
      }
    }

    const res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers,
    })

    if (res.status === 401 && !isRetry) {
      const newToken = await this.tryRefreshToken()
      if (newToken) {
        return this.request<T>(path, options, true)
      }
    }

    if (!res.ok) {
      let errorData: unknown
      try {
        errorData = await res.json()
      } catch {
        errorData = { detail: res.statusText }
      }
      throw new ApiError(res.status, errorData)
    }

    if (res.status === 204) return null as T

    return res.json() as T
  }

  get<T>(path: string) {
    return this.request<T>(path)
  }

  post<T>(path: string, data?: unknown) {
    return this.request<T>(path, {
      method: "POST",
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  put<T>(path: string, data: unknown) {
    return this.request<T>(path, {
      method: "PUT",
      body: JSON.stringify(data),
    })
  }

  patch<T>(path: string, data: unknown) {
    return this.request<T>(path, {
      method: "PATCH",
      body: JSON.stringify(data),
    })
  }

  delete<T>(path: string) {
    return this.request<T>(path, { method: "DELETE" })
  }
}

/** Shared app-wide API client; call `hydrateFromStorage` at startup in the browser. */
export const api = new ApiClient()
export { ApiError }
