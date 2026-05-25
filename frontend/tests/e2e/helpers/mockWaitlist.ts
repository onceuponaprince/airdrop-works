import type { Page } from '@playwright/test'

type WaitlistMockOptions = {
  alreadyExists?: boolean
  rank?: number
  referralCode?: string
}

/** Mock waitlist Next.js routes — avoids production Supabase in CI. */
export async function installWaitlistMocks(
  page: Page,
  opts: WaitlistMockOptions = {},
) {
  const rank = opts.rank ?? 42
  const referralCode = opts.referralCode ?? 'e2e-ref-code'
  const siteBase = process.env.E2E_BASE_URL || 'http://localhost:3011'

  await page.route('**/api/waitlist/count', async (route) => {
    if (route.request().method() === 'GET') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ count: 128 }),
      })
    }
    return route.continue()
  })

  await page.route('**/api/waitlist/check', async (route) => {
    if (route.request().method() === 'POST') {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ exists: false }),
      })
    }
    return route.continue()
  })

  await page.route('**/api/waitlist', async (route) => {
    if (route.request().method() !== 'POST') {
      return route.continue()
    }

    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        rank,
        referralCode,
        referralUrl: `${siteBase}/?ref=${referralCode}`,
        alreadyExists: opts.alreadyExists ?? false,
      }),
    })
  })
}

export const WAITLIST_SUBMIT_QUEST_STATE = {
  currentStep: 'submit' as const,
  completedSteps: ['email', 'wallet', 'twitter'] as const,
  walletAddress: '0x' + 'a'.repeat(40),
  email: 'e2e-waitlist@example.com',
  twitterHandle: null as string | null,
}

export const WAITLIST_EMAIL_ONLY_QUEST_STATE = {
  currentStep: 'submit' as const,
  completedSteps: ['email', 'wallet', 'twitter'] as const,
  walletAddress: null as string | null,
  email: 'e2e-waitlist@example.com',
  twitterHandle: null as string | null,
}
