'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Zap, AtSign, AlertCircle, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAiJudge } from '@/hooks/useAiJudge';
import { useTwitterAnalyze } from '@/hooks/useTwitterAnalyze';
import { useCredits } from '@/hooks/useCredits';
import { ScoreCard } from '@/components/app/ScoreCard';
import { AccountScoreCard } from '@/components/app/AccountScoreCard';
import { ScoreShareModal } from '@/components/app/ScoreShareModal';
import { ArcadeButton } from '@/components/themed/ArcadeButton';
import { ArcadeCard } from '@/components/themed/ArcadeCard';
import Link from 'next/link';

type Tab = 'text' | 'account';

const DEMO_TWEETS = [
  'Just deployed a full Uniswap V3 fork on Avalanche with custom fee tiers. Here\'s my technical breakdown of the concentrated liquidity math...',
  'GM! Another day another airdrop! Like, RT, follow for guaranteed 100x! NFA DYOR 🚀🚀🚀',
  'Thread: How I reduced gas costs by 40% using EIP-4844 blobs for our L2 rollup. Detailed benchmarks inside 🧵',
];

export default function JudgePage() {
  const [tab, setTab] = useState<Tab>('text');
  const [text, setText] = useState('');
  const [twitterHandle, setTwitterHandle] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const { status, result, liveScore, error, score, reset } = useAiJudge();
  const twitter = useTwitterAnalyze();
  const { credits, plan, loading: creditsLoading, refresh: refreshCredits } = useCredits();

  const insufficientCredits = !creditsLoading && credits <= 0;
  const insufficientForAccount = !creditsLoading && credits < 5;

  const handleScore = async () => {
    if (!text.trim() || insufficientCredits) return;
    await score(text);
    refreshCredits();
    setModalOpen(true);
  };

  const handleScoreAnother = () => {
    reset();
    setText('');
    setModalOpen(false);
  };

  const handleAnalyze = async () => {
    if (!twitterHandle.trim() || insufficientForAccount) return;
    await twitter.analyze(twitterHandle);
    refreshCredits();
    setAccountModalOpen(true);
  };

  const handleAnalyzeAnother = () => {
    twitter.reset();
    setTwitterHandle('');
    setAccountModalOpen(false);
  };

  return (
    <div className="h-full overflow-y-auto p-6 lg:p-8">
      <div className="max-w-2xl mx-auto space-y-8">
        <div>
          <h1 className="font-display text-2xl text-[--primary] mb-2">AI Judge</h1>
          <p className="text-sm text-[--muted-foreground]">
            Score Web3 contributions with AI-powered precision.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex gap-1 bg-[--secondary] p-1 rounded-lg w-fit">
          <button
            onClick={() => setTab('text')}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2 rounded text-sm font-medium transition-colors',
              tab === 'text'
                ? 'bg-[--card] text-[--foreground] shadow-sm'
                : 'text-[--muted-foreground] hover:text-[--foreground]'
            )}
          >
            <Zap size={14} />
            Score Text
          </button>
          <button
            onClick={() => setTab('account')}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2 rounded text-sm font-medium transition-colors',
              tab === 'account'
                ? 'bg-[--card] text-[--foreground] shadow-sm'
                : 'text-[--muted-foreground] hover:text-[--foreground]'
            )}
          >
            <AtSign size={14} />
            Analyze Account
          </button>
        </div>

        {/* Insufficient credits warning */}
        {insufficientCredits && (
          <ArcadeCard className="border-[--destructive]/50">
            <div className="flex items-start gap-3">
              <AlertCircle size={18} className="text-[--destructive] shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-[--foreground]">No credits remaining</p>
                <p className="text-xs text-[--muted-foreground] mt-1">
                  Your {plan} plan credits have been used up.{' '}
                  <Link href="/pricing" className="text-[--primary] underline">
                    Upgrade your plan
                  </Link>{' '}
                  or buy a credit pack to continue scoring.
                </p>
              </div>
            </div>
          </ArcadeCard>
        )}

        {/* Score Text tab */}
        {tab === 'text' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            {/* Demo tweets */}
            <div className="space-y-2">
              <p className="text-xs font-mono text-[--muted-foreground] uppercase tracking-widest">
                Try a sample
              </p>
              <div className="flex flex-wrap gap-2">
                {DEMO_TWEETS.map((tweet, i) => (
                  <button
                    key={i}
                    onClick={() => setText(tweet)}
                    className="text-left text-xs px-3 py-2 rounded border border-[--border] bg-[--card] text-[--muted-foreground] hover:border-[--primary]/50 hover:text-[--foreground] transition-colors line-clamp-1 max-w-[220px]"
                  >
                    {tweet.slice(0, 60)}...
                  </button>
                ))}
              </div>
            </div>

            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste a tweet or write contribution text to score..."
              rows={5}
              maxLength={5000}
              className="w-full rounded-lg border border-[--border] bg-[--card] px-4 py-3 text-sm text-[--foreground] placeholder:text-[--muted-foreground] focus:outline-none focus:ring-2 focus:ring-[--ring] resize-none font-body"
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-[--muted-foreground]">{text.length}/5000</span>
              <ArcadeButton
                onClick={handleScore}
                loading={status === 'scoring'}
                disabled={!text.trim() || status === 'scoring' || insufficientCredits}
                icon={<Zap size={14} />}
              >
                Score (1 credit)
              </ArcadeButton>
            </div>

            {error && (
              <p className="text-sm text-[--destructive]">{error}</p>
            )}

            {/* Live score preview during streaming */}
            {status === 'scoring' && liveScore && (
              <ArcadeCard className="animate-pulse">
                <p className="font-mono text-xs text-[--muted-foreground] mb-2">Scoring...</p>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-xs text-[--muted-foreground]">Teaching</p>
                    <p className="font-mono text-lg text-[--foreground]">{liveScore.teachingValue}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[--muted-foreground]">Originality</p>
                    <p className="font-mono text-lg text-[--foreground]">{liveScore.originality}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[--muted-foreground]">Impact</p>
                    <p className="font-mono text-lg text-[--foreground]">{liveScore.communityImpact}</p>
                  </div>
                </div>
              </ArcadeCard>
            )}

            {/* Inline result (in addition to modal) */}
            {status === 'complete' && result && !modalOpen && (
              <div className="flex justify-center">
                <ScoreCard
                  result={result}
                  showReset
                  showShare
                  onReset={handleScoreAnother}
                />
              </div>
            )}
          </motion.div>
        )}

        {/* Account tab */}
        {tab === 'account' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            {plan === 'free' && (
              <ArcadeCard className="border-[--accent]/50">
                <div className="flex items-start gap-3">
                  <AlertCircle size={18} className="text-[--accent] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-[--foreground]">Pro plan required</p>
                    <p className="text-xs text-[--muted-foreground] mt-1">
                      Twitter account analysis is available on Pro and Team plans.{' '}
                      <Link href="/pricing" className="text-[--primary] underline">
                        Upgrade now
                      </Link>
                    </p>
                  </div>
                </div>
              </ArcadeCard>
            )}

            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[--muted-foreground] text-sm">@</span>
                <input
                  type="text"
                  value={twitterHandle}
                  onChange={(e) => setTwitterHandle(e.target.value.replace(/^@/, ''))}
                  placeholder="twitter_handle"
                  className="w-full pl-8 pr-4 py-2.5 rounded-lg border border-[--border] bg-[--card] text-sm text-[--foreground] placeholder:text-[--muted-foreground] focus:outline-none focus:ring-2 focus:ring-[--ring] font-mono"
                  disabled={plan === 'free'}
                />
              </div>
              <ArcadeButton
                onClick={handleAnalyze}
                loading={twitter.status === 'fetching' || twitter.status === 'scoring'}
                disabled={
                  !twitterHandle.trim() ||
                  twitter.status === 'fetching' ||
                  twitter.status === 'scoring' ||
                  insufficientForAccount ||
                  plan === 'free'
                }
                icon={<Search size={14} />}
              >
                Analyze (5 credits)
              </ArcadeButton>
            </div>

            {twitter.error && (
              <p className="text-sm text-[--destructive]">{twitter.error}</p>
            )}

            {/* Progress: tweets being scored */}
            {(twitter.status === 'fetching' || twitter.status === 'scoring') && (
              <ArcadeCard className="animate-pulse">
                <p className="font-mono text-xs text-[--muted-foreground]">
                  {twitter.status === 'fetching'
                    ? 'Fetching tweets...'
                    : `Scoring ${twitter.tweets.length}/${twitter.tweetCount} tweets...`}
                </p>
              </ArcadeCard>
            )}

            {/* Live tweet scores as they arrive */}
            {twitter.status === 'scoring' && twitter.tweets.length > 0 && (
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {twitter.tweets.map((t) => (
                  <div key={t.tweetId} className="flex items-center gap-2 text-xs py-1">
                    <span className="font-mono text-[--primary] w-6 text-right">{t.compositeScore}</span>
                    <span className="text-[--foreground] truncate">{t.text}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Complete: show account score card */}
            {twitter.status === 'complete' && twitter.accountResult && !accountModalOpen && (
              <div className="flex justify-center">
                <AccountScoreCard analysis={twitter.accountResult} />
              </div>
            )}
          </motion.div>
        )}
      </div>

      {/* Share modal — text scoring */}
      <ScoreShareModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onScoreAnother={handleScoreAnother}
        result={result}
      />

      {/* Share modal — account analysis */}
      <ScoreShareModal
        open={accountModalOpen}
        onClose={() => setAccountModalOpen(false)}
        onScoreAnother={handleAnalyzeAnother}
        accountResult={twitter.accountResult}
      />
    </div>
  );
}
