import type { Page, Route } from '@playwright/test'

type Json = Record<string, unknown>

type ApiMockOptions = {
  token?: string
  profile?: Json
  contributions?: Json
  subscription?: Json
}

function jsonResponse(route: Route, status: number, data: unknown) {
  return route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(data),
  })
}

function getPath(urlString: string): string {
  const url = new URL(urlString)
  // URL.pathname includes `/api/v1/...`
  return url.pathname
}

export async function installApiV1Mocks(page: Page, opts: ApiMockOptions = {}) {
  const profile =
    opts.profile ??
    ({
      id: 'user_1',
      walletAddress: '0x' + 'a'.repeat(40),
      displayName: 'Tester',
      totalXp: 1234,
      educatorXp: 400,
      builderXp: 300,
      creatorXp: 200,
      scoutXp: 150,
      diplomatXp: 184,
      skillTreeState: {},
      rank: 42,
      primaryBranch: 'educator',
      createdAt: new Date('2026-01-01T00:00:00.000Z').toISOString(),
    } as Json)

  const contributions =
    opts.contributions ??
    ({
      count: 1,
      next: null,
      previous: null,
      results: [
        {
          id: 'c_1',
          platform: 'twitter',
          platformContentId: 'tweet_1',
          url: 'https://x.com/example/status/1',
          text: 'A high quality explainer thread about MEV.',
          finalScore: 88,
          scoreVersion: 'spore-v1',
          createdAt: new Date('2026-05-01T00:00:00.000Z').toISOString(),
        },
      ],
    } as Json)

  const subscription =
    opts.subscription ??
    ({
      plan: 'pro',
      status: 'active',
      monthly_credits: 100,
      credits_remaining: 100,
      credits_reset_at: null,
      current_period_end: null,
      cancel_at_period_end: false,
      portal_available: false,
    } as Json)

  await page.route('**/api/v1/**', async (route) => {
    const req = route.request()
    const path = getPath(req.url())



    if (path.endsWith('/api/v1/auth/me/')) {
      return jsonResponse(route, 200, {
        wallet_address: profile.walletAddress,
        id: profile.id,
      })
    }

    if (path.endsWith('/api/v1/profiles/me/')) {
      return jsonResponse(route, 200, profile)
    }

    if (path.includes('/api/v1/contributions/')) {
      return jsonResponse(route, 200, contributions)
    }

    if (path.endsWith('/api/v1/payments/user-subscription/')) {
      return jsonResponse(route, 200, subscription)
    }

    if (path.endsWith('/api/v1/payments/user-portal/')) {
      return jsonResponse(route, 200, { url: 'https://example.test/portal' })
    }

    if (path.endsWith('/api/v1/auth/twitter/me/')) {
      return jsonResponse(route, 200, { connected: false })
    }

    if (path.includes('/api/v1/auth/twitter/start/')) {
      return jsonResponse(route, 200, {
        authorizeUrl: 'https://twitter.com/i/oauth2/authorize?mock=1',
        state: 'e2e-state',
        mode: 'link',
      })
    }

    if (path.endsWith('/api/v1/contributions/sources/') && req.method() === 'GET') {
      return jsonResponse(route, 200, [])
    }

    if (path.match(/\/api\/v1\/contributions\/sources\/[^/]+\/crawl\/$/)) {
      return jsonResponse(route, 202, { task_id: 'task_e2e_crawl' })
    }

    if (path.match(/\/api\/v1\/contributions\/crawl\/[^/]+\/$/) && req.method() === 'POST') {
      return jsonResponse(route, 202, { task_id: 'task_e2e_connect' })
    }

    // Default: surface unexpected calls to make tests actionable.
    return jsonResponse(route, 501, { detail: `No mock for ${path} (${req.method()})` })
  })
}

export async function setAuthToken(page: Page, token = 'e2e-token') {
  await page.addInitScript((t) => {
    window.localStorage.setItem('auth_token', t)
    window.localStorage.setItem('refresh_token', 'e2e-refresh')
    window.localStorage.setItem('airdrop_cookie_consent', 'essential')
  }, token)
}
