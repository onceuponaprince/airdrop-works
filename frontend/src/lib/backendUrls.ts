/** Canonical default when BACKEND_URL is unset (Docker host-mapped API port). */
export const DEFAULT_BACKEND_URL = "http://localhost:8001"

export function resolveBackendUrl(raw?: string): string {
  return (raw?.trim() || DEFAULT_BACKEND_URL).replace(/\/$/, "")
}

/** Same-origin path for Telegram login poll (Next.js rewrite → Django). */
export function telegramLoginPollPath(pollKey: string): string {
  return `/api/v1/auth/telegram/login/poll/?poll_key=${encodeURIComponent(pollKey)}`
}

export function mergeConfirmBackendUrl(backendBase?: string): string {
  return `${resolveBackendUrl(backendBase)}/api/v1/auth/merge/confirm/`
}
