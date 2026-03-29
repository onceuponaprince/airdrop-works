/**
 * Server route: rate-limited POST scores text with Anthropic (or mock stream without API key); responds with NDJSON partials + final JSON.
 */

import { NextRequest, NextResponse } from "next/server"
import Anthropic from "@anthropic-ai/sdk"

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SCORING_PROMPT = `You are the AI Judge for AI(r)Drop, a Web3 contribution scoring platform.

Evaluate the following Web3 content and score it across three dimensions (0–100 each):

- Teaching Value: Does this help someone understand something? Explains, clarifies, onboards?
- Originality: Novel insight or recycled common knowledge? Adds to the discourse?
- Community Impact: Serves the community? Bug reports, tools, translations, moderation?

Also determine farmingFlag:
- "genuine": authentic content created to provide value
- "farming": engagement farming patterns — templates, excessive hashtags, low-effort hype, bot-like structure
- "ambiguous": has some value but also farming signals

Respond ONLY with valid JSON, no other text:
{
  "teachingValue": <0-100>,
  "originality": <0-100>,
  "communityImpact": <0-100>,
  "compositeScore": <rounded average of the three>,
  "farmingFlag": "genuine" | "farming" | "ambiguous",
  "farmingExplanation": "<1-2 sentences explaining the farming assessment>",
  "dimensionExplanations": {
    "teachingValue": "<1 sentence>",
    "originality": "<1 sentence>",
    "communityImpact": "<1 sentence>"
  }
}`

// ── Rate limiting ─────────────────────────────────────────────────────────────

const rateLimit = new Map<string, { count: number; resetAt: number }>()

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimit.get(ip)
  if (!entry || now > entry.resetAt) {
    rateLimit.set(ip, { count: 1, resetAt: now + 60_000 })
    return true
  }
  if (entry.count >= 10) return false
  entry.count++
  return true
}

// ── Streaming helpers ─────────────────────────────────────────────────────────

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms))
}

interface JudgeResult {
  teachingValue: number
  originality: number
  communityImpact: number
  compositeScore: number
  farmingFlag: "genuine" | "farming" | "ambiguous"
  farmingExplanation: string
  dimensionExplanations: {
    teachingValue: string
    originality: string
    communityImpact: string
  }
  scoredAt: string
}

function createScoreStream(result: JudgeResult) {
  const encoder = new TextEncoder()
  const line = (v: unknown) => encoder.encode(JSON.stringify(v) + "\n")

  return new ReadableStream({
    async start(controller) {
      controller.enqueue(line({ type: "status", phase: "reading" }))
      await sleep(250)

      controller.enqueue(
        line({
          type: "partial",
          partial: {
            teachingValue: Math.round(result.teachingValue * 0.45),
            originality: Math.round(result.originality * 0.45),
            communityImpact: Math.round(result.communityImpact * 0.45),
          },
        })
      )
      await sleep(300)

      controller.enqueue(
        line({
          type: "partial",
          partial: {
            teachingValue: Math.round(result.teachingValue * 0.75),
            originality: Math.round(result.originality * 0.75),
            communityImpact: Math.round(result.communityImpact * 0.75),
          },
        })
      )
      await sleep(300)

      controller.enqueue(
        line({
          type: "partial",
          partial: {
            teachingValue: result.teachingValue,
            originality: result.originality,
            communityImpact: result.communityImpact,
          },
        })
      )

      controller.enqueue(line({ type: "final", result }))
      controller.close()
    },
  })
}

// ── Error handling ────────────────────────────────────────────────────────────

function anthropicErrorResponse(err: unknown): NextResponse | null {
  if (err instanceof Anthropic.AuthenticationError) {
    console.error("[AI Judge] Invalid API key — update ANTHROPIC_API_KEY in root .env")
    return NextResponse.json({ error: "AI Judge configuration error." }, { status: 500 })
  }
  if (err instanceof Anthropic.RateLimitError) {
    return NextResponse.json({ error: "Rate limit reached. Please try again shortly." }, { status: 429 })
  }
  if (err instanceof Anthropic.BadRequestError || err instanceof Anthropic.PermissionDeniedError) {
    const msg = err.message ?? ""
    if (msg.toLowerCase().includes("credit balance")) {
      console.error("[AI Judge] Anthropic credit balance too low — top up at console.anthropic.com/settings/plans")
      return NextResponse.json(
        { error: "Scoring temporarily unavailable — service credit exhausted." },
        { status: 503 }
      )
    }
    console.error("[AI Judge] Anthropic API error:", msg)
    return NextResponse.json({ error: "Scoring temporarily unavailable. Please try again." }, { status: 503 })
  }
  if (err instanceof Anthropic.APIError) {
    console.error("[AI Judge] Anthropic API error:", err.status, err.message)
    return NextResponse.json({ error: "Scoring temporarily unavailable. Please try again." }, { status: 503 })
  }
  return null
}

// ── Route handler ─────────────────────────────────────────────────────────────

/** Validates body, enforces per-IP limit, returns streaming judge lines or JSON error. */
export async function POST(req: NextRequest) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"

  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment and try again." },
      { status: 429 }
    )
  }

  let text: string
  try {
    const body = await req.json()
    text = body.text?.trim()
    if (!text) throw new Error("No text provided")
    if (text.length > 5000) throw new Error("Text too long (max 5000 chars)")
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Invalid request" },
      { status: 400 }
    )
  }

  // Dev fallback — mock when no API key configured
  if (!process.env.ANTHROPIC_API_KEY) {
    const mock: JudgeResult = {
      teachingValue: 72,
      originality: 58,
      communityImpact: 65,
      compositeScore: 65,
      farmingFlag: "genuine",
      farmingExplanation: "Mock response — configure ANTHROPIC_API_KEY to enable real scoring.",
      dimensionExplanations: {
        teachingValue: "Mock score — real scoring requires API key.",
        originality: "Mock score — real scoring requires API key.",
        communityImpact: "Mock score — real scoring requires API key.",
      },
      scoredAt: new Date().toISOString(),
    }
    return new NextResponse(createScoreStream(mock), {
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    })
  }

  try {
    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 512,
      messages: [
        {
          role: "user",
          content: `${SCORING_PROMPT}\n\nContent to evaluate:\n\n${text}`,
        },
      ],
    })

    const responseText =
      message.content[0].type === "text" ? message.content[0].text : ""

    const raw = JSON.parse(responseText) as Record<string, unknown>

    const result: JudgeResult = {
      teachingValue: Number(raw.teachingValue),
      originality: Number(raw.originality),
      communityImpact: Number(raw.communityImpact),
      compositeScore: Number(raw.compositeScore),
      farmingFlag: raw.farmingFlag as JudgeResult["farmingFlag"],
      farmingExplanation: String(raw.farmingExplanation),
      dimensionExplanations: {
        teachingValue: String(
          (raw.dimensionExplanations as Record<string, unknown>)?.teachingValue ?? ""
        ),
        originality: String(
          (raw.dimensionExplanations as Record<string, unknown>)?.originality ?? ""
        ),
        communityImpact: String(
          (raw.dimensionExplanations as Record<string, unknown>)?.communityImpact ?? ""
        ),
      },
      scoredAt: new Date().toISOString(),
    }

    return new NextResponse(createScoreStream(result), {
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    })
  } catch (err) {
    const anthropicResponse = anthropicErrorResponse(err)
    if (anthropicResponse) return anthropicResponse

    if (err instanceof SyntaxError) {
      console.error("[AI Judge] Failed to parse Anthropic response:", err)
      return NextResponse.json(
        { error: "Failed to parse judge response. Please try again." },
        { status: 500 }
      )
    }

    console.error("[AI Judge] Unexpected error:", err)
    return NextResponse.json(
      { error: "Scoring temporarily unavailable. Please try again." },
      { status: 503 }
    )
  }
}
