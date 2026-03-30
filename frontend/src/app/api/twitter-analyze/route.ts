import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const MAX_TWEETS = 25
const TWITTER_API_BASE = "https://api.twitter.com/2"

// ── Rate limiting ─────────────────────────────────────────────────────────────

const rateLimit = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimit.get(ip)
  if (!entry || now > entry.resetAt) {
    rateLimit.set(ip, { count: 1, resetAt: now + 300_000 })
    return true
  }
  if (entry.count >= 3) return false
  entry.count++
  return true
}

// ── Twitter API helpers ───────────────────────────────────────────────────────

interface TwitterUser {
  id: string
  name: string
  username: string
  profile_image_url?: string
}

interface TwitterTweet {
  id: string
  text: string
  created_at?: string
}

async function fetchTwitterUser(username: string, bearerToken: string): Promise<TwitterUser> {
  const res = await fetch(
    `${TWITTER_API_BASE}/users/by/username/${encodeURIComponent(username)}?user.fields=profile_image_url`,
    { headers: { Authorization: `Bearer ${bearerToken}` } }
  )
  if (!res.ok) {
    const body = await res.text()
    console.error("[Twitter] User lookup failed:", res.status, body)
    if (res.status === 401) throw new Error("Twitter API credentials are invalid")
    if (res.status === 404) throw new Error(`Twitter user @${username} not found`)
    if (res.status === 429) throw new Error("Twitter rate limit — try again in a few minutes")
    throw new Error(`Could not find Twitter user @${username}`)
  }
  const data = await res.json()
  if (!data.data?.id) throw new Error(`Twitter user @${username} not found`)
  return data.data as TwitterUser
}

async function fetchRecentTweets(
  userId: string,
  bearerToken: string,
  maxResults: number
): Promise<TwitterTweet[]> {
  const url = new URL(`${TWITTER_API_BASE}/users/${userId}/tweets`)
  url.searchParams.set("max_results", String(Math.min(maxResults, 100)))
  url.searchParams.set("tweet.fields", "created_at,author_id")
  url.searchParams.set("exclude", "retweets,replies")

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${bearerToken}` },
  })
  if (!res.ok) {
    const body = await res.text()
    console.error("[Twitter] Tweets fetch failed:", res.status, body)
    if (res.status === 429) throw new Error("Twitter rate limit — try again in a few minutes")
    throw new Error("Failed to fetch tweets from Twitter")
  }
  const data = await res.json()
  return (data.data ?? []) as TwitterTweet[]
}

// ── Claude batch scoring prompt ───────────────────────────────────────────────

function buildBatchScoringPrompt(username: string, tweets: TwitterTweet[]): string {
  const tweetBlock = tweets
    .map((t, i) => `--- TWEET ${i} ---\n${t.text}`)
    .join("\n\n")

  return `You are the AI Judge for AI(r)Drop, a Web3 contribution quality scoring platform.

Evaluate each of the following ${tweets.length} tweets from @${username} INDIVIDUALLY across three dimensions (0–100 each):

- Teaching Value: Does this help someone understand something? Explains, clarifies, onboards?
- Originality: Novel insight or recycled common knowledge? Adds to the discourse?
- Community Impact: Serves the community? Bug reports, tools, translations, moderation?

Also determine farmingFlag for each tweet:
- "genuine": authentic content created to provide value
- "farming": engagement farming patterns — templates, excessive hashtags, low-effort hype, bot-like structure
- "ambiguous": has some value but also farming signals

After scoring all tweets individually, provide an overall account assessment.

Respond ONLY with valid JSON in this exact format (no markdown, no explanation):
{
  "tweets": [
    {
      "index": 0,
      "teachingValue": 72,
      "originality": 65,
      "communityImpact": 80,
      "compositeScore": 72,
      "farmingFlag": "genuine",
      "oneLiner": "one sentence summary of the tweet's value"
    }
  ],
  "accountSummary": {
    "overallScore": 70,
    "farmingPercentage": 15,
    "strengths": "one sentence about account strengths",
    "weaknesses": "one sentence about areas to improve",
    "verdict": "genuine"
  }
}

TWEETS TO EVALUATE:

${tweetBlock}`
}

// ── Streaming helpers ─────────────────────────────────────────────────────────

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms))
}

interface StreamEvent {
  type: string
  [key: string]: unknown
}

function createAnalysisStream(
  username: string,
  twitterUser: TwitterUser,
  tweets: TwitterTweet[],
  scoringResultPromise: Promise<string>
) {
  const encoder = new TextEncoder()
  const line = (v: StreamEvent) => encoder.encode(JSON.stringify(v) + "\n")

  return new ReadableStream({
    async start(controller) {
      try {
        controller.enqueue(
          line({
            type: "tweets_fetched",
            count: tweets.length,
            username,
            displayName: twitterUser.name,
            avatarUrl: twitterUser.profile_image_url,
          })
        )
        await sleep(200)

        controller.enqueue(
          line({ type: "status", phase: "scoring", message: `AI Judge is reading ${tweets.length} tweets…` })
        )

        const responseText = await scoringResultPromise

        let parsed: {
          tweets: Array<{
            index: number
            teachingValue: number
            originality: number
            communityImpact: number
            compositeScore: number
            farmingFlag: string
            oneLiner: string
          }>
          accountSummary: {
            overallScore: number
            farmingPercentage: number
            strengths: string
            weaknesses: string
            verdict: string
          }
        }

        try {
          parsed = JSON.parse(responseText)
        } catch {
          const jsonMatch = responseText.match(/\{[\s\S]*\}/)
          if (!jsonMatch) throw new Error("Failed to parse scoring response")
          parsed = JSON.parse(jsonMatch[0])
        }

        for (let i = 0; i < parsed.tweets.length; i++) {
          const s = parsed.tweets[i]
          const tweet = tweets[s.index ?? i]
          if (!tweet) continue

          controller.enqueue(
            line({
              type: "tweet_score",
              index: i,
              tweetId: tweet.id,
              text: tweet.text,
              url: `https://x.com/${username}/status/${tweet.id}`,
              score: {
                teachingValue: Number(s.teachingValue),
                originality: Number(s.originality),
                communityImpact: Number(s.communityImpact),
                compositeScore: Number(s.compositeScore),
                farmingFlag: s.farmingFlag,
                oneLiner: s.oneLiner,
              },
            })
          )
          await sleep(120)
        }

        const tweetScores = parsed.tweets.map((s, i) => {
          const tweet = tweets[s.index ?? i]
          return {
            index: s.index ?? i,
            tweetId: tweet?.id ?? "",
            text: tweet?.text ?? "",
            url: tweet ? `https://x.com/${username}/status/${tweet.id}` : "",
            teachingValue: Number(s.teachingValue),
            originality: Number(s.originality),
            communityImpact: Number(s.communityImpact),
            compositeScore: Number(s.compositeScore),
            farmingFlag: s.farmingFlag as "genuine" | "farming" | "ambiguous",
            oneLiner: s.oneLiner,
          }
        })

        const summary = parsed.accountSummary
        const genuineCount = tweetScores.filter((t) => t.farmingFlag === "genuine").length
        const avgTeaching = Math.round(tweetScores.reduce((a, t) => a + t.teachingValue, 0) / tweetScores.length)
        const avgOriginality = Math.round(tweetScores.reduce((a, t) => a + t.originality, 0) / tweetScores.length)
        const avgImpact = Math.round(tweetScores.reduce((a, t) => a + t.communityImpact, 0) / tweetScores.length)

        controller.enqueue(
          line({
            type: "final",
            analysis: {
              username,
              displayName: twitterUser.name,
              avatarUrl: twitterUser.profile_image_url,
              tweetCount: tweets.length,
              tweets: tweetScores,
              aggregate: {
                overallScore: Number(summary.overallScore),
                teachingValue: avgTeaching,
                originality: avgOriginality,
                communityImpact: avgImpact,
                farmingPercentage: Number(summary.farmingPercentage),
                genuinePercentage: Math.round((genuineCount / tweetScores.length) * 100),
                strengths: summary.strengths,
                weaknesses: summary.weaknesses,
                verdict: summary.verdict as "genuine" | "farming" | "ambiguous",
              },
              analyzedAt: new Date().toISOString(),
            },
          })
        )
      } catch (err) {
        const message = err instanceof Error ? err.message : "Analysis failed"
        controller.enqueue(line({ type: "error", message }))
      } finally {
        controller.close()
      }
    },
  })
}

// ── Mock data for dev without API keys ────────────────────────────────────────

function createMockStream(username: string) {
  const encoder = new TextEncoder()
  const line = (v: StreamEvent) => encoder.encode(JSON.stringify(v) + "\n")

  const mockTweets = [
    { text: "Thread on how bridges actually work in DeFi — the trust assumptions nobody talks about.", flag: "genuine" as const, scores: [78, 72, 70] },
    { text: "GM frens!! LFG this project is going to moon 🚀🚀 $TOKEN", flag: "farming" as const, scores: [12, 8, 15] },
    { text: "Interesting update from Aave v3 — supply caps per asset are a smart risk move.", flag: "genuine" as const, scores: [65, 55, 60] },
    { text: "Built a small tool that tracks liquidation risk across your DeFi positions. Open source.", flag: "genuine" as const, scores: [82, 88, 85] },
    { text: "Who else is bullish? Drop a 🔥 if you're holding! #crypto #DeFi #web3", flag: "farming" as const, scores: [5, 5, 10] },
  ]

  return new ReadableStream({
    async start(controller) {
      controller.enqueue(
        line({
          type: "tweets_fetched",
          count: mockTweets.length,
          username,
          displayName: username,
          avatarUrl: undefined,
        })
      )
      await sleep(300)

      controller.enqueue(
        line({ type: "status", phase: "scoring", message: `AI Judge is reading ${mockTweets.length} tweets…` })
      )
      await sleep(800)

      const tweetScores = mockTweets.map((m, i) => {
        const composite = Math.round((m.scores[0] + m.scores[1] + m.scores[2]) / 3)
        return {
          index: i,
          tweetId: `mock_${i}`,
          text: m.text,
          url: `https://x.com/${username}/status/mock_${i}`,
          teachingValue: m.scores[0],
          originality: m.scores[1],
          communityImpact: m.scores[2],
          compositeScore: composite,
          farmingFlag: m.flag,
          oneLiner: "Mock score — configure API keys for real analysis.",
        }
      })

      for (const ts of tweetScores) {
        controller.enqueue(
          line({
            type: "tweet_score",
            index: ts.index,
            tweetId: ts.tweetId,
            text: ts.text,
            url: ts.url,
            score: ts,
          })
        )
        await sleep(200)
      }

      const genuineCount = tweetScores.filter((t) => t.farmingFlag === "genuine").length
      const avgTeaching = Math.round(tweetScores.reduce((a, t) => a + t.teachingValue, 0) / tweetScores.length)
      const avgOriginality = Math.round(tweetScores.reduce((a, t) => a + t.originality, 0) / tweetScores.length)
      const avgImpact = Math.round(tweetScores.reduce((a, t) => a + t.communityImpact, 0) / tweetScores.length)
      const overallScore = Math.round((avgTeaching + avgOriginality + avgImpact) / 3)

      controller.enqueue(
        line({
          type: "final",
          analysis: {
            username,
            displayName: username,
            avatarUrl: undefined,
            tweetCount: tweetScores.length,
            tweets: tweetScores,
            aggregate: {
              overallScore,
              teachingValue: avgTeaching,
              originality: avgOriginality,
              communityImpact: avgImpact,
              farmingPercentage: Math.round(((tweetScores.length - genuineCount) / tweetScores.length) * 100),
              genuinePercentage: Math.round((genuineCount / tweetScores.length) * 100),
              strengths: "Mock data — configure ANTHROPIC_API_KEY and TWITTER_BEARER_TOKEN for real analysis.",
              weaknesses: "Mock data — real analysis requires API keys.",
              verdict: "genuine" as const,
            },
            analyzedAt: new Date().toISOString(),
          },
        })
      )
      controller.close()
    },
  })
}

// ── Error handling ────────────────────────────────────────────────────────────

function anthropicErrorResponse(err: unknown): NextResponse | null {
  if (err instanceof Anthropic.AuthenticationError) {
    console.error("[TwitterAnalyze] Invalid Anthropic API key")
    return NextResponse.json({ error: "AI Judge configuration error." }, { status: 500 })
  }
  if (err instanceof Anthropic.RateLimitError) {
    return NextResponse.json({ error: "Rate limit reached. Please try again shortly." }, { status: 429 })
  }
  if (err instanceof Anthropic.APIError) {
    console.error("[TwitterAnalyze] Anthropic API error:", err.status, err.message)
    return NextResponse.json({ error: "Scoring temporarily unavailable." }, { status: 503 })
  }
  return null
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"

  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a few minutes and try again." },
      { status: 429 }
    )
  }

  let username: string
  try {
    const body = await req.json()
    username = (body.username ?? "").trim().replace(/^@/, "")
    if (!username) throw new Error("No username provided")
    if (!/^[A-Za-z0-9_]{1,15}$/.test(username)) throw new Error("Invalid Twitter handle")
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invalid request" },
      { status: 400 }
    )
  }

  const bearerToken = process.env.TWITTER_BEARER_TOKEN
  const anthropicKey = process.env.ANTHROPIC_API_KEY

  if (!bearerToken || !anthropicKey) {
    return new NextResponse(createMockStream(username), {
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    })
  }

  try {
    const twitterUser = await fetchTwitterUser(username, bearerToken)
    const tweets = await fetchRecentTweets(twitterUser.id, bearerToken, MAX_TWEETS)

    if (tweets.length === 0) {
      return NextResponse.json(
        { error: `@${username} has no recent original tweets to analyze.` },
        { status: 404 }
      )
    }

    const scoringPromise = client.messages
      .create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        messages: [
          { role: "user", content: buildBatchScoringPrompt(username, tweets) },
        ],
      })
      .then((msg) => {
        const block = msg.content[0]
        return block.type === "text" ? block.text : ""
      })

    return new NextResponse(createAnalysisStream(username, twitterUser, tweets, scoringPromise), {
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    })
  } catch (err) {
    const anthropicRes = anthropicErrorResponse(err)
    if (anthropicRes) return anthropicRes

    const message = err instanceof Error ? err.message : "Analysis failed"
    console.error("[TwitterAnalyze] Error:", message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
