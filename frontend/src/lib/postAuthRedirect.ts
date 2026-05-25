/** Post-login routing contract (S5 hooks; S7 owns /onboarding UI). */

export type PostAuthDestination = "/dashboard" | "/onboarding"

export type PostAuthContext = {
  authMethod: "wallet" | "social" | "email"
  created?: boolean
  walletAddress?: string | null
}

const POST_AUTH_DEST_KEY = "post_auth_dest"
const ONBOARDING_COMPLETE_KEY = "onboarding_completed"

export function markOnboardingComplete(): void {
  if (typeof window === "undefined") return
  window.localStorage.setItem(ONBOARDING_COMPLETE_KEY, "1")
}

export function hasCompletedOnboarding(): boolean {
  if (typeof window === "undefined") return false
  return window.localStorage.getItem(ONBOARDING_COMPLETE_KEY) === "1"
}

export function resolvePostAuthDestination(ctx: PostAuthContext): PostAuthDestination {
  if (ctx.authMethod === "wallet") {
    return "/dashboard"
  }

  if (hasCompletedOnboarding()) {
    return "/dashboard"
  }

  if (ctx.created) {
    return "/onboarding"
  }

  const wallet = ctx.walletAddress?.trim()
  if (!wallet) {
    return "/onboarding"
  }

  return "/dashboard"
}

export function setPostAuthDestination(dest: PostAuthDestination): void {
  if (typeof window === "undefined") return
  window.sessionStorage.setItem(POST_AUTH_DEST_KEY, dest)
}

export function peekPostAuthDestination(): PostAuthDestination | null {
  if (typeof window === "undefined") return null
  const stored = window.sessionStorage.getItem(POST_AUTH_DEST_KEY)
  if (stored === "/onboarding" || stored === "/dashboard") {
    return stored
  }
  return null
}

export function consumePostAuthDestination(): PostAuthDestination | null {
  if (typeof window === "undefined") return null
  const stored = window.sessionStorage.getItem(POST_AUTH_DEST_KEY)
  window.sessionStorage.removeItem(POST_AUTH_DEST_KEY)
  if (stored === "/onboarding" || stored === "/dashboard") {
    return stored
  }
  return null
}
