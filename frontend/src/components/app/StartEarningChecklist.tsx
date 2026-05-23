'use client';

import Link from 'next/link';
import { useSyncExternalStore } from 'react';
import { CheckCircle2, Circle, X } from 'lucide-react';
import { useSocialAccounts } from '@/hooks/useSocialAccounts';

const DISMISS_KEY = 'airdrop_start_earning_dismissed';
const LEADERBOARD_KEY = 'airdrop_start_earning_leaderboard_viewed';
const DISMISS_EVENT = 'airdrop_start_earning_dismiss_changed';

const STEPS = [
  {
    id: 'wallet',
    label: 'Connect wallet',
    hint: "You're signed in — wallet linked.",
    href: null,
  },
  {
    id: 'social',
    label: 'Link at least one social account',
    hint: 'Connect Twitter, Discord, or GitHub.',
    href: '#social-accounts',
  },
  {
    id: 'score',
    label: 'Score your first post',
    hint: 'Run the AI Judge on a contribution.',
    href: '/judge',
  },
  {
    id: 'leaderboard',
    label: 'Check the live campaign leaderboard',
    hint: 'See where you rank this season.',
    href: '/leaderboard',
  },
] as const;

function getDismissedSnapshot() {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(DISMISS_KEY) === '1';
}

function subscribeDismissed(callback: () => void) {
  window.addEventListener('storage', callback);
  window.addEventListener(DISMISS_EVENT, callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener(DISMISS_EVENT, callback);
  };
}

function isLeaderboardViewed() {
  if (typeof window === 'undefined') return false;
  return window.localStorage.getItem(LEADERBOARD_KEY) === '1';
}

function markLeaderboardViewed() {
  window.localStorage.setItem(LEADERBOARD_KEY, '1');
  window.dispatchEvent(new Event(DISMISS_EVENT));
}

export function markStartEarningLeaderboardViewed() {
  markLeaderboardViewed();
}

function dismissChecklist() {
  window.localStorage.setItem(DISMISS_KEY, '1');
  window.dispatchEvent(new Event(DISMISS_EVENT));
}

interface StartEarningChecklistProps {
  hasScored?: boolean;
}

export function StartEarningChecklist({ hasScored = false }: StartEarningChecklistProps) {
  const dismissed = useSyncExternalStore(subscribeDismissed, getDismissedSnapshot, () => false);
  const leaderboardViewed = useSyncExternalStore(subscribeDismissed, isLeaderboardViewed, () => false);
  const { accounts } = useSocialAccounts();

  const hasSocial = (accounts.data?.length ?? 0) > 0;

  const done: Record<(typeof STEPS)[number]['id'], boolean> = {
    wallet: true,
    social: hasSocial,
    score: hasScored,
    leaderboard: leaderboardViewed,
  };

  const completedCount = Object.values(done).filter(Boolean).length;

  if (dismissed || completedCount >= STEPS.length) {
    return null;
  }

  return (
    <div className="relative rounded-lg border border-[--border] bg-[--card]/80 px-4 py-3">
      <button
        type="button"
        onClick={dismissChecklist}
        className="absolute right-2 top-2 rounded p-1 text-[--muted-foreground] hover:bg-[--secondary] hover:text-[--foreground] transition-colors"
        aria-label="Dismiss checklist"
      >
        <X size={14} />
      </button>

      <div className="pr-6">
        <p className="font-mono text-[10px] uppercase tracking-widest text-[--muted-foreground]">
          Start earning
        </p>
        <p className="font-heading text-sm font-semibold text-[--foreground] mt-0.5">
          {completedCount} of {STEPS.length} steps done
        </p>
      </div>

      <ul className="mt-3 space-y-1.5">
        {STEPS.map((step) => {
          const isDone = done[step.id];
          const content = (
            <>
              {isDone ? (
                <CheckCircle2 size={16} className="text-[--primary] shrink-0 mt-0.5" />
              ) : (
                <Circle size={16} className="text-[--muted-foreground] shrink-0 mt-0.5" />
              )}
              <span className="min-w-0">
                <span
                  className={`font-body text-sm block ${isDone ? 'text-[--muted-foreground] line-through' : 'text-[--foreground]'}`}
                >
                  {step.label}
                </span>
                {!isDone && (
                  <span className="font-body text-xs text-[--muted-foreground]">{step.hint}</span>
                )}
              </span>
            </>
          );

          if (!step.href || isDone) {
            return (
              <li key={step.id} className="flex items-start gap-2.5 px-1 py-1">
                {content}
              </li>
            );
          }

          const handleClick = step.id === 'leaderboard' ? markLeaderboardViewed : undefined;

          return (
            <li key={step.id}>
              <Link
                href={step.href}
                onClick={handleClick}
                className="flex items-start gap-2.5 rounded px-1 py-1 hover:bg-[--secondary]/40 transition-colors"
              >
                {content}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export const startEarningDismissKey = DISMISS_KEY;
export const startEarningLeaderboardKey = LEADERBOARD_KEY;
