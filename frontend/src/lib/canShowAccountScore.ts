/** Marketing unlock + auth gates for "Score your whole account". */

export const WAITLIST_JOINED_KEY = "waitlist_joined"
export const JUDGE_DEMO_TRIED_KEY = "judge_demo_tried"

export const ACCOUNT_SCORE_GATE_CHANGED = "airdrop:account-score-gate-changed"

export const ACCOUNT_SCORE_RETURN_PATH = "/#twitter-analyzer"
export const ACCOUNT_SCORE_LOGIN_MESSAGE_KEY = "account-score"

function hasFlag(key: string): boolean {
  if (typeof window === "undefined") return false
  return window.localStorage.getItem(key) === "1"
}

/** True when waitlist completed or landing tweet/post demo was scored. */
export function canShowAccountScore(): boolean {
  return hasFlag(WAITLIST_JOINED_KEY) || hasFlag(JUDGE_DEMO_TRIED_KEY)
}

export function markWaitlistJoined(): void {
  if (typeof window === "undefined") return
  window.localStorage.setItem(WAITLIST_JOINED_KEY, "1")
  window.dispatchEvent(new Event(ACCOUNT_SCORE_GATE_CHANGED))
}

export function markJudgeDemoTried(): void {
  if (typeof window === "undefined") return
  window.localStorage.setItem(JUDGE_DEMO_TRIED_KEY, "1")
  window.dispatchEvent(new Event(ACCOUNT_SCORE_GATE_CHANGED))
}

export function isAuthenticatedForAccountScore(): boolean {
  if (typeof window === "undefined") return false
  return Boolean(window.localStorage.getItem("auth_token")?.trim())
}

export function buildAccountScoreLoginUrl(
  returnPath: string = ACCOUNT_SCORE_RETURN_PATH,
): string {
  const next = returnPath.startsWith("/") ? returnPath : `/${returnPath}`
  const params = new URLSearchParams({
    next,
    message: ACCOUNT_SCORE_LOGIN_MESSAGE_KEY,
  })
  return `/login?${params.toString()}`
}
