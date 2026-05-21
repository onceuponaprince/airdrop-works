'use client';

import { useEffect } from 'react';
import { useTwitterAuth } from '@/hooks/useTwitterAuth';
import { useTwitterFeed } from '@/hooks/useTwitterFeed';
import { useWeb3Auth } from '@/hooks/useWeb3Auth';

export function TwitterWatchPanel() {
  const { token } = useWeb3Auth();
  const { status, connect, disconnect, syncNow, updateWatch, isLoading } = useTwitterAuth();
  const feed = useTwitterFeed(token, Boolean(status?.connected));

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('twitter') === 'login' && params.get('access')) {
      localStorage.setItem('auth_token', params.get('access')!);
      if (params.get('refresh')) {
        localStorage.setItem('refresh_token', params.get('refresh')!);
      }
      window.history.replaceState({}, '', '/sources?twitter=connected');
      window.location.reload();
    }
  }, []);

  if (!token) {
    return (
      <div className="rounded-lg border border-[--border] bg-[--card] p-6">
        <h2 className="font-heading text-lg font-bold">Watch your X account</h2>
        <p className="mt-2 text-sm text-[--muted-foreground]">
          Connect a wallet first, then link X for OAuth tweet watch and live ingestion.
        </p>
        <button
          type="button"
          onClick={() => connect('login')}
          className="mt-4 rounded border border-[--border] px-4 py-2 text-sm font-semibold"
        >
          Sign in with X only
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-[--primary]/40 bg-[--card] p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="font-heading text-lg font-bold">Watch your X account</h2>
          <p className="mt-1 text-sm text-[--muted-foreground]">
            OAuth timeline polling + live WebSocket feed. Sentiment runs on each ingested tweet.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!status?.connected ? (
            <>
              <button
                type="button"
                disabled={isLoading}
                onClick={() => connect('link')}
                className="rounded border border-[--primary] bg-[--primary] px-4 py-2 text-sm font-semibold text-[--primary-foreground]"
              >
                Link X account
              </button>
              <button
                type="button"
                onClick={() => connect('login')}
                className="rounded border border-[--border] px-4 py-2 text-sm"
              >
                Login with X
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => syncNow()}
                className="rounded border border-[--border] px-3 py-2 text-sm"
              >
                Sync now
              </button>
              <button
                type="button"
                onClick={() => disconnect()}
                className="rounded border border-[--destructive] px-3 py-2 text-sm text-[--destructive]"
              >
                Disconnect
              </button>
            </>
          )}
        </div>
      </div>

      {status?.connected ? (
        <div className="mt-4 space-y-3 text-sm">
          <p>
            <span className="font-mono text-[--primary]">@{status.twitterUsername}</span>
            {status.lastError ? (
              <span className="ml-2 text-[--destructive]">{status.lastError}</span>
            ) : null}
          </p>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={status.watchEnabled ?? true}
              onChange={(e) => updateWatch({ watchEnabled: e.target.checked })}
            />
            Watch enabled (Celery polls every few minutes)
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={status.useSeleniumFallback ?? false}
              onChange={(e) => updateWatch({ useSeleniumFallback: e.target.checked })}
            />
            Selenium fallback if API fails (dev only)
          </label>
          <p className="text-xs text-[--muted-foreground]">
            WebSocket: {feed.status} · {feed.events.length} events buffered
          </p>
          <ul className="max-h-48 space-y-2 overflow-y-auto rounded border border-[--border] p-3">
            {feed.events.length === 0 ? (
              <li className="text-[--muted-foreground]">Waiting for new tweets…</li>
            ) : (
              feed.events.map((ev, i) => (
                <li key={`${ev.contributionId ?? i}-${ev.createdAt ?? i}`} className="border-b border-[--border] pb-2 last:border-0">
                  {ev.type === 'tweet.ingested' ? (
                    <>
                      <span className="font-mono text-xs text-[--primary]">
                        {ev.sentiment?.label} ({ev.sentiment?.score})
                      </span>
                      <p className="mt-1">{ev.text}</p>
                    </>
                  ) : (
                    <span>{ev.message ?? ev.type}</span>
                  )}
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
