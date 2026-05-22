import { describe, expect, it } from "vitest"
import { buildAccountAnalysisCsv } from "@/lib/exportAccountCsv"
import type { AccountAnalysis } from "@/types/api"

const sample: AccountAnalysis = {
  username: "educator",
  displayName: "Educator",
  tweetCount: 1,
  analyzedAt: "2026-05-21T12:00:00Z",
  aggregate: {
    overallScore: 72,
    teachingValue: 80,
    originality: 70,
    communityImpact: 65,
    farmingPercentage: 10,
    genuinePercentage: 90,
    strengths: "Clear threads",
    weaknesses: "Low volume",
    verdict: "genuine",
  },
  tweets: [
    {
      index: 1,
      tweetId: "1",
      text: 'Says "hello" here',
      url: "https://x.com/i/status/1",
      teachingValue: 80,
      originality: 70,
      communityImpact: 65,
      compositeScore: 72,
      farmingFlag: "genuine",
      oneLiner: "Solid",
    },
  ],
}

describe("buildAccountAnalysisCsv", () => {
  it("includes account summary and escaped tweet text", () => {
    const csv = buildAccountAnalysisCsv(sample)
    expect(csv).toContain("username,educator")
    expect(csv).toContain("farming_percentage,10")
    expect(csv).toContain('"Says ""hello"" here"')
    expect(csv).toContain("genuine")
  })
})
