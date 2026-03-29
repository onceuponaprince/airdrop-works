import type { JudgeResult, AccountAnalysis } from '@/types/api';
import { FARMING_FLAGS } from '@/lib/constants';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://airdrop.works';

export function buildScoreShareUrl(result: JudgeResult): string {
  const params = new URLSearchParams({
    composite: String(result.compositeScore),
    teaching: String(result.teachingValue),
    originality: String(result.originality),
    impact: String(result.communityImpact),
    flag: result.farmingFlag,
  });
  return `${SITE_URL}/score?${params.toString()}`;
}

export function buildTwitterShareUrl(result: JudgeResult): string {
  const scoreUrl = buildScoreShareUrl(result);
  const flagLabel = FARMING_FLAGS[result.farmingFlag].label;

  const text = `My AI Judge score: ${result.compositeScore}/100 — ${flagLabel} contributor. Can you beat it?`;

  const twitterParams = new URLSearchParams({ text, url: scoreUrl });
  return `https://twitter.com/intent/tweet?${twitterParams.toString()}`;
}

export function buildAccountShareUrl(analysis: AccountAnalysis): string {
  const params = new URLSearchParams({
    user: analysis.username,
    score: String(analysis.aggregate.overallScore),
    tweets: String(analysis.tweetCount),
    genuine: String(analysis.aggregate.genuinePercentage),
    verdict: analysis.aggregate.verdict,
  });
  return `${SITE_URL}/score?${params.toString()}`;
}

export function buildAccountTwitterShareUrl(analysis: AccountAnalysis): string {
  const shareUrl = buildAccountShareUrl(analysis);
  const verdictLabel = FARMING_FLAGS[analysis.aggregate.verdict].label;

  const text = [
    `AI Judge scanned my last ${analysis.tweetCount} tweets:`,
    `${analysis.aggregate.overallScore}/100 overall — "${verdictLabel}" contributor`,
    `${analysis.aggregate.genuinePercentage}% genuine content`,
    `Think your account is better? Find out 👇`,
  ].join('\n');

  const twitterParams = new URLSearchParams({ text, url: shareUrl });
  return `https://twitter.com/intent/tweet?${twitterParams.toString()}`;
}
