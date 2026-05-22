import type { AccountAnalysis } from "@/types/api"

function escapeCsvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return ""
  const s = String(value)
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

function row(cells: (string | number | null | undefined)[]): string {
  return cells.map(escapeCsvCell).join(",")
}

/**
 * Build a CSV string for allocator review (Campaign Integrity Pilot v0).
 * Includes account summary rows plus one row per scored tweet.
 */
export function buildAccountAnalysisCsv(analysis: AccountAnalysis): string {
  const { aggregate: a } = analysis
  const lines: string[] = []

  lines.push("section,field,value")
  lines.push(row(["account", "username", analysis.username]))
  lines.push(row(["account", "display_name", analysis.displayName ?? ""]))
  lines.push(row(["account", "analyzed_at", analysis.analyzedAt]))
  lines.push(row(["account", "tweet_count", analysis.tweetCount]))
  lines.push(row(["account", "overall_score", a.overallScore]))
  lines.push(row(["account", "teaching_value", a.teachingValue]))
  lines.push(row(["account", "originality", a.originality]))
  lines.push(row(["account", "community_impact", a.communityImpact]))
  lines.push(row(["account", "genuine_percentage", a.genuinePercentage]))
  lines.push(row(["account", "farming_percentage", a.farmingPercentage]))
  lines.push(row(["account", "verdict", a.verdict]))
  lines.push(row(["account", "strengths", a.strengths]))
  lines.push(row(["account", "weaknesses", a.weaknesses]))
  lines.push("")

  lines.push(
    row([
      "index",
      "tweet_id",
      "composite_score",
      "teaching_value",
      "originality",
      "community_impact",
      "farming_flag",
      "one_liner",
      "text",
      "url",
    ])
  )

  for (const t of analysis.tweets) {
    lines.push(
      row([
        t.index,
        t.tweetId,
        t.compositeScore,
        t.teachingValue,
        t.originality,
        t.communityImpact,
        t.farmingFlag,
        t.oneLiner,
        t.text,
        t.url,
      ])
    )
  }

  return lines.join("\n")
}

/** Trigger a browser download of the account analysis CSV. */
export function downloadAccountAnalysisCsv(analysis: AccountAnalysis): void {
  const csv = buildAccountAnalysisCsv(analysis)
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const handle = analysis.username.replace(/^@/, "")
  const date = analysis.analyzedAt.slice(0, 10)
  const filename = `airdrop-integrity-${handle}-${date}.csv`

  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  anchor.rel = "noopener"
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}
