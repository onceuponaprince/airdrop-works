export type MergeLoginStatus = "confirmed" | "pending" | "error"

export type LoginMergeParams = {
  status: MergeLoginStatus
  access?: string
  refresh?: string
  email?: string
  reason?: string
}

const MERGE_ERROR_MESSAGES: Record<string, string> = {
  missing_token: "Merge link is missing a token. Request a new confirmation email.",
  invalid_token: "This merge link is invalid or has expired. Request a new confirmation email.",
  backend_unavailable: "We couldn't confirm your merge right now. Try again in a moment.",
}

export function mergeErrorMessage(reason: string | null | undefined): string {
  if (!reason) {
    return "Account linking failed. Try signing in again or request a new confirmation email."
  }
  return MERGE_ERROR_MESSAGES[reason] ?? MERGE_ERROR_MESSAGES.missing_token
}

export function parseLoginMergeParams(
  input: URLSearchParams | string,
): LoginMergeParams | null {
  const params = typeof input === "string" ? new URLSearchParams(input) : input
  const status = params.get("merge")
  if (status !== "confirmed" && status !== "pending" && status !== "error") {
    return null
  }

  return {
    status,
    access: params.get("access") ?? undefined,
    refresh: params.get("refresh") ?? undefined,
    email: params.get("email") ?? undefined,
    reason: params.get("reason") ?? undefined,
  }
}

/** Apply JWT from merge=confirmed callback and strip query params from the URL. */
export function consumeMergeConfirmedCallback(
  applySession: (access: string, refresh: string) => void,
): boolean {
  if (typeof window === "undefined") return false

  const parsed = parseLoginMergeParams(window.location.search)
  if (!parsed || parsed.status !== "confirmed" || !parsed.access) {
    return false
  }

  applySession(parsed.access, parsed.refresh ?? "")
  window.history.replaceState({}, "", window.location.pathname)
  return true
}
