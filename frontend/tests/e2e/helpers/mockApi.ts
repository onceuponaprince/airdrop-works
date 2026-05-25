import type { Page, Route } from '@playwright/test'

type Json = Record<string, unknown>

type JudgeScorePayload = {
  teaching_value: number
  originality: number
  community_impact: number
  composite_score: number
  farming_flag: 'genuine' | 'farming' | 'ambiguous'
  farming_explanation?: string
  dimension_explanations?: Record<string, string>
}

type TweetScorePayload = {
  index: number
  tweetId: string
  text: string
  url: string
  teachingValue: number
  originality: number
  communityImpact: number
  compositeScore: number
  farmingFlag: 'genuine' | 'farming' | 'ambiguous'
  oneLiner: string
}

type AccountAnalysisPayload = {
  username: string
  displayName?: string
  avatarUrl?: string
  tweetCount: number
  tweets: TweetScorePayload[]
  aggregate: {
    overallScore: number
    teachingValue: number
    originality: number
    communityImpact: number
    farmingPercentage: number
    genuinePercentage: number
    strengths: string
    weaknesses: string
    verdict: 'genuine' | 'farming' | 'ambiguous'
  }
  analyzedAt: string
}

/** Rows for GET `/auth/social/me/` (snake_case matches DRF JSON). */
export type SocialAccountMockRow = {
  platform: string
  username: string
  display_name?: string
  connected_at: string
  last_synced_at?: string | null
  last_error?: string
}

type ApiMockOptions = {
  token?: string
  profile?: Json
  contributions?: Json
  subscription?: Json
  judgeScore?: JudgeScorePayload
  scoreAccount?: AccountAnalysisPayload
  /** Overrides default empty list from GET `/auth/social/me/` */
  socialAccounts?: SocialAccountMockRow[]
  /** Initial payload for `/auth/twitter/me/`; GET returns this (after PATCH merges). Omit for `{ connected: false }`. */
  twitterMe?: Record<string, unknown>
  /** Initial rows for GET `/contributions/sources/`; grows when POST `/contributions/crawl/<platform>/` runs in-app */
  crawlSources?: Record<string, unknown>[]
}

function normalizeCrawlKey(platform: string, body: Record<string, unknown>): string {
  if (platform === 'twitter') {
    return String(body.username ?? '')
      .trim()
      .replace(/^@/, '')
      .toLowerCase()
  }
  if (platform === 'reddit') {
    const trimmed = String(body.subreddit ?? '').trim()
    return trimmed
      .replace(/^r\//i, '')
      .replace(/^\/+|\/+$/g, '')
      .toLowerCase()
  }
  if (platform === 'discord') {
    return String(body.channel_id ?? '').trim()
  }
  if (platform === 'telegram') {
    return String(body.chat_id ?? '').trim()
  }
  return ''
}

function newE2ECrawlRow(platform: string, sourceKey: string): Record<string, unknown> {
  const now = new Date().toISOString()
  const safeSlug = `${platform}_${sourceKey}`.replace(/[^a-z0-9_]/gi, '_').slice(0, 56)
  return {
    id: `src_e2e_${safeSlug}`,
    platform,
    source_key: sourceKey,
    is_active: true,
    cursor: '',
    last_crawled_at: now,
    last_error: '',
    metadata: {
      lastRunAt: now,
      lastFetchedCount: 2,
      lastCreatedCount: 1,
      lastCursor: 'e2e_cursor',
    },
    created_at: now,
    updated_at: now,
  }
}

function ndjson(lines: unknown[]): string {
  return lines.map((l) => JSON.stringify(l)).join('\n') + '\n'
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

/** Strip trailing slashes for stable matching (Next + Django tolerate both). */
function pathNoTrailingSlash(path: string): string {
  const s = path.replace(/\/+$/, '')
  return s.length > 0 ? s : '/'
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

  let twitterMe: Record<string, unknown> =
    opts.twitterMe !== undefined
      ? (JSON.parse(JSON.stringify(opts.twitterMe)) as Record<string, unknown>)
      : { connected: false }

  let crawlSources: Record<string, unknown>[] =
    opts.crawlSources !== undefined
      ? (JSON.parse(JSON.stringify(opts.crawlSources)) as Record<string, unknown>[])
      : []

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

    const lbNorm = pathNoTrailingSlash(path)
    if (lbNorm === '/api/v1/leaderboard/multi-platform' && req.method() === 'GET') {
      return jsonResponse(route, 200, [])
    }

    if (pathNoTrailingSlash(path) === '/api/v1/contributions/sources' && req.method() === 'GET') {
      return jsonResponse(route, 200, crawlSources)
    }

    if (/^\/api\/v1\/contributions\/sources\/[^/]+\/crawl\/?$/.test(path) && req.method() === 'POST') {
      return jsonResponse(route, 202, { task_id: 'task_e2e_crawl', status: 'queued' })
    }

    const crawlSourceByIdMatch = path.match(/^\/api\/v1\/contributions\/sources\/([^/]+)\/?$/)
    if (crawlSourceByIdMatch && req.method() === 'PATCH') {
      const sid = crawlSourceByIdMatch[1]
      let patchBody: Record<string, unknown> = {}
      try {
        patchBody = (req.postDataJSON() as Record<string, unknown>) ?? {}
      } catch {
        patchBody = {}
      }
      const ix = crawlSources.findIndex((r) => String((r as Json).id) === sid)
      if (ix < 0) {
        return jsonResponse(route, 404, { detail: 'Source not found' })
      }
      const merged: Record<string, unknown> = {
        ...crawlSources[ix],
        ...patchBody,
        updated_at: new Date().toISOString(),
      }
      crawlSources[ix] = merged
      return jsonResponse(route, 200, merged)
    }

    if (crawlSourceByIdMatch && req.method() === 'DELETE') {
      const sid = crawlSourceByIdMatch[1]
      crawlSources = crawlSources.filter((r) => String((r as Json).id) !== sid)
      return route.fulfill({ status: 204 })
    }

    const crawlNewMatch = path.match(/^\/api\/v1\/contributions\/crawl\/([\w]+)\/?$/)
    if (crawlNewMatch && req.method() === 'POST') {
      const platformKey = crawlNewMatch[1]
      let crawlBody: Record<string, unknown> = {}
      try {
        crawlBody = (req.postDataJSON() as Record<string, unknown>) ?? {}
      } catch {
        crawlBody = {}
      }
      const sourceKey = normalizeCrawlKey(platformKey, crawlBody)
      const row =
        sourceKey.trim() !== '' ? newE2ECrawlRow(platformKey, sourceKey) : null
      if (
        row
        && !crawlSources.some(
          (s) =>
            String((s as Json).platform) === platformKey
            && String((s as Json).source_key) === sourceKey,
        )
      ) {
        crawlSources.push(row)
      }
      return jsonResponse(route, 202, { task_id: 'task_e2e_connect', status: 'queued' })
    }

    if (pathNoTrailingSlash(path) === '/api/v1/contributions' && req.method() === 'GET') {
      return jsonResponse(route, 200, contributions)
    }

    if (path.endsWith('/api/v1/payments/user-subscription/')) {
      return jsonResponse(route, 200, subscription)
    }

    if (path.endsWith('/api/v1/payments/user-portal/')) {
      return jsonResponse(route, 200, { url: 'https://example.test/portal' })
    }

    if (path.endsWith('/api/v1/auth/twitter/me/')) {
      if (req.method() === 'GET') {
        return jsonResponse(route, 200, twitterMe)
      }
      if (req.method() === 'PATCH') {
        let patch: Record<string, unknown> = {}
        try {
          patch = (req.postDataJSON() as Record<string, unknown>) ?? {}
        } catch {
          patch = {}
        }
        twitterMe = { ...twitterMe, ...patch }
        return jsonResponse(route, 200, twitterMe)
      }
      if (req.method() === 'DELETE') {
        twitterMe = { connected: false }
        return route.fulfill({ status: 204 })
      }
      return jsonResponse(route, 501, { detail: `No mock for ${path} (${req.method()})` })
    }

    if (path.endsWith('/api/v1/auth/twitter/sync/') && req.method() === 'POST') {
      return jsonResponse(route, 200, { taskId: 'e2e_twitter_sync', status: 'queued' })
    }

    if (path.endsWith('/api/v1/auth/social/me/') && req.method() === 'GET') {
      return jsonResponse(route, 200, opts.socialAccounts ?? [])
    }

    if (path.endsWith('/api/v1/auth/social/disconnect/') && req.method() === 'POST') {
      return jsonResponse(route, 200, { status: 'disconnected' })
    }

    if (path.endsWith('/api/v1/auth/social/connect/') && req.method() === 'POST') {
      return jsonResponse(route, 200, { status: 'connected' })
    }

    if (path.endsWith('/api/v1/auth/social/sync/') && req.method() === 'POST') {
      return jsonResponse(route, 200, {
        message: 'Scoring jobs queued for connected accounts.',
      })
    }

    if (path.endsWith('/api/v1/auth/discord/start/') && req.method() === 'GET') {
      return jsonResponse(route, 200, {
        authorizeUrl: 'https://discord.com/oauth2/authorize?mock=1',
        state: 'e2e-discord-state',
      })
    }

    if (path.endsWith('/api/v1/auth/telegram/start/') && req.method() === 'GET') {
      return jsonResponse(route, 200, {
        deepLink: 'tg://resolve?domain=E2EAirdropWorksBot',
        instructions: 'Open Telegram and tap Start.',
        expiresInMinutes: 10,
      })
    }

    if (path.endsWith('/api/v1/auth/discord/channels/') && req.method() === 'POST') {
      let body: { channel_ids?: unknown } = {}
      try {
        body = (req.postDataJSON() as { channel_ids?: unknown }) ?? {}
      } catch {
        body = {}
      }
      const raw = Array.isArray(body.channel_ids) ? body.channel_ids : []
      const clean: string[] = []
      const seen = new Set<string>()
      for (const entry of raw) {
        const v = String(entry).trim()
        if (v && !seen.has(v)) {
          seen.add(v)
          clean.push(v)
        }
      }
      return jsonResponse(route, 200, {
        status: 'updated',
        tracked_channels: clean.slice(0, 20),
      })
    }

    if (path.includes('/api/v1/auth/twitter/start/')) {
      return jsonResponse(route, 200, {
        authorizeUrl: 'https://twitter.com/i/oauth2/authorize?mock=1',
        state: 'e2e-state',
        mode: 'link',
      })
    }

    if (path.includes('/api/v1/judge/score-account') && req.method() === 'POST') {
      const username =
        (() => {
          try {
            const body = req.postDataJSON() as { username?: string }
            return (body?.username ?? 'demo_user').replace(/^@/, '')
          } catch {
            return 'demo_user'
          }
        })() || 'demo_user'

      const tweet: TweetScorePayload = {
        index: 0,
        tweetId: 't_1',
        text: 'A thoughtful technical post.',
        url: `https://x.com/${username}/status/1`,
        teachingValue: 80,
        originality: 70,
        communityImpact: 65,
        compositeScore: 72,
        farmingFlag: 'genuine',
        oneLiner: 'Solid technical insight.',
      }

      const analysis: AccountAnalysisPayload =
        opts.scoreAccount ??
        ({
          username,
          displayName: username,
          avatarUrl: '',
          tweetCount: 1,
          tweets: [tweet],
          aggregate: {
            overallScore: 72,
            teachingValue: 70,
            originality: 68,
            communityImpact: 75,
            farmingPercentage: 10,
            genuinePercentage: 80,
            strengths: 'Consistent educational threads.',
            weaknesses: 'Could add more primary sources.',
            verdict: 'genuine',
          },
          analyzedAt: new Date().toISOString(),
        } satisfies AccountAnalysisPayload)

      const body = ndjson([
        {
          type: 'tweets_fetched',
          count: analysis.tweetCount,
          username: analysis.username,
          displayName: analysis.displayName,
          avatarUrl: analysis.avatarUrl,
        },
        { type: 'tweet_score', score: tweet },
        { type: 'final', analysis, credits_remaining: 95 },
      ])

      return route.fulfill({
        status: 200,
        headers: { 'content-type': 'application/x-ndjson; charset=utf-8' },
        body,
      })
    }

    const wallet = (profile.walletAddress as string) ?? '0x' + 'a'.repeat(40)

    if (path.match(/^\/api\/v1\/integrity\/0x[a-fA-F0-9]{40}\/?$/)) {
      return jsonResponse(route, 200, {
        walletAddress: wallet,
        compositeScore: 72,
        teachingValue: 70,
        originality: 68,
        communityImpact: 75,
        farmingFlag: 'genuine',
        farmingPercentage: 10,
        contributionCount: 2,
        scoredAt: new Date().toISOString(),
      })
    }

    if (path.match(/^\/api\/v1\/profiles\/0x[a-fA-F0-9]{40}\/reputation\/history\/?$/)) {
      return jsonResponse(route, 200, {
        walletAddress: wallet,
        count: 1,
        limit: 50,
        offset: 0,
        results: [
          {
            id: 'c_1',
            platform: 'twitter',
            contentPreview: 'Thread on concentrated liquidity…',
            compositeScore: 88,
            farmingFlag: 'genuine',
            scoredAt: new Date('2026-05-22T00:00:00.000Z').toISOString(),
          },
        ],
      })
    }

    if (path.match(/^\/api\/v1\/profiles\/0x[a-fA-F0-9]{40}\/reputation\/export\/?$/)) {
      return jsonResponse(route, 200, {
        '@context': 'https://airdrop.works/schemas/reputation/v1',
        type: 'PortableReputationExport',
        specVersion: '1.0.0',
        exportedAt: new Date().toISOString(),
        walletAddress: wallet,
        summary: {
          walletAddress: wallet,
          compositeScore: 72,
          teachingValue: 70,
          originality: 68,
          communityImpact: 75,
          farmingFlag: 'genuine',
          farmingPercentage: 10,
          contributionCount: 2,
          scoredAt: new Date().toISOString(),
        },
        profile: { totalXp: 1234, rank: 42, primaryBranch: 'educator' },
        history: [
          {
            id: 'c_1',
            platform: 'twitter',
            contentPreview: 'Thread on concentrated liquidity…',
            compositeScore: 88,
            farmingFlag: 'genuine',
            scoredAt: new Date('2026-05-22T00:00:00.000Z').toISOString(),
          },
        ],
        meta: { historyCount: 1, historyLimit: 50 },
      })
    }

    if (path.endsWith('/api/v1/integrity/appeals/me/') && req.method() === 'GET') {
      return jsonResponse(route, 200, { results: [] })
    }

    // Appeal detail (staff) - match appeals/<uuid>/ but not appeals/me/
    if (path.match(/\/api\/v1\/integrity\/appeals\/[0-9a-f-]{36}\/$/) && req.method() === 'GET') {
      return jsonResponse(route, 200, {
        id: 'appeal-uuid',
        subject: 'contribution',
        status: 'pending',
        reason: 'Test appeal detail view.',
        contributionId: 'c_1',
        snapshotFarmingFlag: 'farming',
        snapshotCompositeScore: 15,
        resolutionNote: null,
        resolvedAt: null,
        createdAt: new Date().toISOString(),
        walletAddress: wallet,
      })
    }

    // Protocol console (staff) - return 401 for unauthenticated in E2E
    if (path.includes('/api/v1/integrity/console/')) {
      return jsonResponse(route, 401, { detail: 'Authentication required.' })
    }

    if (/^\/api\/v1\/judge\/score\/?$/.test(path) && req.method() === 'POST') {
      const score =
        opts.judgeScore ??
        ({
          teaching_value: 82,
          originality: 74,
          community_impact: 66,
          composite_score: 74,
          farming_flag: 'genuine',
          farming_explanation: 'Looks like a genuine technical contribution.',
          dimension_explanations: {
            teaching_value: 'Explains the why, not just the what.',
            originality: 'Contains original synthesis.',
            community_impact: 'Actionable for builders.',
          },
        } satisfies JudgeScorePayload)
      return jsonResponse(route, 200, {
        ...score,
        scored_at: new Date().toISOString(),
        credits_remaining: 99,
      })
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
