'use client';

/**
 * Hook for full Twitter account analysis.
 *
 * Calls the backend's `/api/v1/judge/score-account/` endpoint which returns
 * an NDJSON stream with the following message sequence:
 *
 *   1. { type: "tweets_fetched" } — tweet count + user metadata
 *   2. { type: "tweet_score" }    — one per tweet, with individual scores
 *   3. { type: "final" }          — aggregate analysis for the full account
 *   4. { type: "error" }          — only on failure
 *
 * State transitions: idle → fetching → scoring → complete (or error)
 */

import { useState, useCallback } from 'react';
import type { TweetScore, AccountAnalysis } from '@/types/api';
import { useNotificationStore } from '@/stores/useNotificationStore';
import { api } from '@/lib/api';

interface TwitterAnalyzeState {
  status: 'idle' | 'fetching' | 'scoring' | 'complete' | 'error';
  tweets: TweetScore[];
  accountResult: AccountAnalysis | null;
  tweetCount: number;
  username: string;
  displayName: string;
  avatarUrl: string;
  error: string | null;
  creditsRemaining: number | null;
}

export function useTwitterAnalyze() {
  const notify = useNotificationStore((s) => s.push);
  const [state, setState] = useState<TwitterAnalyzeState>({
    status: 'idle',
    tweets: [],
    accountResult: null,
    tweetCount: 0,
    username: '',
    displayName: '',
    avatarUrl: '',
    error: null,
    creditsRemaining: null,
  });

  const analyze = useCallback(async (username: string) => {
    const handle = username.replace(/^@/, '').trim();
    setState((s) => ({
      ...s,
      status: 'fetching',
      tweets: [],
      accountResult: null,
      error: null,
      username: handle,
      creditsRemaining: null,
    }));

    try {
      const token = localStorage.getItem('auth_token');
      if (!token) throw new Error('Sign in to analyze accounts.');
      api.setToken(token);

      const res = await fetch('/api/v1/judge/score-account/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ username: handle }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { detail?: string }).detail || `Analysis failed (${res.status})`);
      }

      const bodyText = await res.text();
      const lines = bodyText.split('\n').map((l) => l.trim()).filter(Boolean);

      for (const line of lines) {
        let msg: {
          type: string
          count?: number
          username?: string
          displayName?: string
          avatarUrl?: string
          score?: TweetScore
          analysis?: AccountAnalysis
          credits_remaining?: number
          message?: string
        }
        try {
          msg = JSON.parse(line)
        } catch (parseErr) {
          if (parseErr instanceof SyntaxError) continue
          throw parseErr
        }

        if (msg.type === 'tweets_fetched') {
          setState((s) => ({
            ...s,
            status: 'scoring',
            tweetCount: msg.count ?? 0,
            username: msg.username ?? s.username,
            displayName: msg.displayName || msg.username || s.username,
            avatarUrl: msg.avatarUrl || '',
          }));
        }

        if (msg.type === 'tweet_score' && msg.score) {
          const score = msg.score
          const ts: TweetScore = {
            index: score.index,
            tweetId: score.tweetId,
            text: score.text,
            url: score.url,
            teachingValue: score.teachingValue,
            originality: score.originality,
            communityImpact: score.communityImpact,
            compositeScore: score.compositeScore,
            farmingFlag: score.farmingFlag,
            oneLiner: score.oneLiner,
          }
          setState((s) => ({
            ...s,
            tweets: [...s.tweets, ts],
          }))
        }

        if (msg.type === 'final' && msg.analysis) {
          setState((s) => ({
            ...s,
            status: 'complete',
            accountResult: msg.analysis!,
            creditsRemaining: msg.credits_remaining ?? null,
          }))
          notify({
            type: 'success',
            title: 'Account analysis complete',
            message: `@${msg.analysis!.username}: ${msg.analysis!.aggregate.overallScore}/100`,
          })
        }

        if (msg.type === 'error') {
          throw new Error(msg.message ?? 'Analysis failed')
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Analysis failed';
      setState((s) => ({ ...s, status: 'error', error: message }));
      notify({ type: 'error', title: 'Account analysis failed', message });
    }
  }, [notify]);

  const reset = useCallback(() => {
    setState({
      status: 'idle',
      tweets: [],
      accountResult: null,
      tweetCount: 0,
      username: '',
      displayName: '',
      avatarUrl: '',
      error: null,
      creditsRemaining: null,
    });
  }, []);

  return { ...state, analyze, reset };
}
