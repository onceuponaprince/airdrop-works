import type { Page, Route } from '@playwright/test'

type JudgeFinal = {
  teachingValue: number
  originality: number
  communityImpact: number
  compositeScore: number
  farmingFlag: 'genuine' | 'farming' | 'ambiguous'
  farmingExplanation?: string
  dimensionExplanations?: {
    teachingValue?: string
    originality?: string
    communityImpact?: string
  }
  scoredAt?: string
}

type TweetScore = {
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

type AccountFinal = {
  username: string
  displayName?: string
  avatarUrl?: string
  tweetCount: number
  tweets: TweetScore[]
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

function ndjson(lines: unknown[]): string {
  return lines.map((l) => JSON.stringify(l)).join('\n') + '\n'
}

export async function mockJudgeStream(page: Page, final: JudgeFinal) {
  await page.route('**/api/judge', async (route: Route) => {
    const body = ndjson([
      { type: 'status', phase: 'reading' },
      {
        type: 'partial',
        partial: {
          teachingValue: Math.max(0, Math.min(100, Math.round(final.teachingValue / 2))),
          originality: Math.max(0, Math.min(100, Math.round(final.originality / 2))),
          communityImpact: Math.max(0, Math.min(100, Math.round(final.communityImpact / 2))),
        },
      },
      {
        type: 'partial',
        partial: {
          teachingValue: final.teachingValue,
          originality: final.originality,
          communityImpact: final.communityImpact,
        },
      },
      { type: 'final', result: { ...final, scoredAt: final.scoredAt ?? new Date().toISOString() } },
    ])

    return route.fulfill({
      status: 200,
      headers: {
        'content-type': 'application/x-ndjson; charset=utf-8',
      },
      body,
    })
  })
}

export async function mockTwitterAnalyzeStream(
  page: Page,
  analysisInput: Partial<AccountFinal> & { username: string }
) {
  const tweet: TweetScore = {
    index: 0,
    tweetId: 't_1',
    text: 'A thoughtful technical post.',
    url: `https://x.com/${analysisInput.username}/status/1`,
    teachingValue: 80,
    originality: 70,
    communityImpact: 65,
    compositeScore: 72,
    farmingFlag: 'genuine',
    oneLiner: 'Solid technical insight.',
  }

  const analysis: AccountFinal = {
    username: analysisInput.username,
    displayName: analysisInput.displayName ?? analysisInput.username,
    avatarUrl: analysisInput.avatarUrl ?? '',
    tweetCount: analysisInput.tweetCount ?? 1,
    tweets: analysisInput.tweets ?? [tweet],
    aggregate: {
      overallScore: analysisInput.aggregate?.overallScore ?? 79,
      teachingValue: analysisInput.aggregate?.teachingValue ?? 82,
      originality: analysisInput.aggregate?.originality ?? 74,
      communityImpact: analysisInput.aggregate?.communityImpact ?? 65,
      farmingPercentage: analysisInput.aggregate?.farmingPercentage ?? 8,
      genuinePercentage: analysisInput.aggregate?.genuinePercentage ?? 92,
      strengths: analysisInput.aggregate?.strengths ?? 'Clear explanations',
      weaknesses: analysisInput.aggregate?.weaknesses ?? 'Could add more sources',
      verdict: analysisInput.aggregate?.verdict ?? 'genuine',
    },
    analyzedAt: analysisInput.analyzedAt ?? new Date().toISOString(),
  }

  await page.route('**/api/twitter-analyze', async (route: Route) => {
    const body = ndjson([
      {
        type: 'tweets_fetched',
        count: analysis.tweetCount,
        username: analysis.username,
        displayName: analysis.displayName,
        avatarUrl: analysis.avatarUrl,
      },
      {
        type: 'tweet_score',
        score: analysis.tweets[0],
      },
      {
        type: 'final',
        analysis,
        credits_remaining: 95,
      },
    ])

    return route.fulfill({
      status: 200,
      headers: {
        'content-type': 'application/x-ndjson; charset=utf-8',
      },
      body,
    })
  })
}
