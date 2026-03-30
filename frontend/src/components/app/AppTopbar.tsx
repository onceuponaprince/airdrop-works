'use client';

import { WalletButton } from '@/components/shared/WalletButton';
import { Bell, ExternalLink, Coins } from 'lucide-react';
import Link from 'next/link';
import { useNotificationStore } from '@/stores/useNotificationStore';
import { useCredits } from '@/hooks/useCredits';

export function AppTopbar() {
  const unreadCount = useNotificationStore((s) => s.items.filter((item) => !item.read).length);
  const { credits, plan, loading: creditsLoading } = useCredits();

  return (
    <header className="flex items-center justify-between border-b border-[--border] bg-[--card] px-6 py-4">
      <div className="flex-1 flex items-center gap-4">
        <Link
          href="/#ai-judge-demo"
          className="hidden sm:flex items-center gap-1 text-xs font-mono text-[--muted-foreground] hover:text-[--primary] transition-colors"
        >
          <ExternalLink size={12} />
          Demo
        </Link>
      </div>

      <div className="flex items-center gap-4">
        {!creditsLoading && (
          <Link
            href="/pricing"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[--secondary] text-xs font-mono text-[--muted-foreground] hover:text-[--primary] transition-colors"
          >
            <Coins size={14} />
            <span>{credits}</span>
            <span className="hidden sm:inline text-[10px] uppercase opacity-60">{plan}</span>
          </Link>
        )}

        <Link href="/notifications" className="relative p-2 rounded hover:bg-[--secondary]">
          <Bell size={20} />
          {unreadCount > 0 ? (
            <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-[--primary] text-[10px] text-[--primary-foreground] flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          ) : null}
        </Link>

        <WalletButton />
      </div>
    </header>
  );
}
