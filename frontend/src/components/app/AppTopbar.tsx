'use client';

import { WalletButton } from '@/components/shared/WalletButton';
import { Bell } from 'lucide-react';
import Link from 'next/link';
import { useNotificationStore } from '@/stores/useNotificationStore';

export function AppTopbar() {
  const unreadCount = useNotificationStore((s) => s.items.filter((item) => !item.read).length);

  return (
    <header className="flex items-center justify-between border-b border-[--border] bg-[--card] px-6 py-4">
      <div className="flex-1">
        {/* HANDOVER: Insert page title/breadcrumb from route metadata here. */}
      </div>

      {/* Right section */}
      <div className="flex items-center gap-4">
        {/* Notifications */}
        <Link href="/notifications" className="relative p-2 rounded hover:bg-[--secondary]">
          <Bell size={20} />
          {unreadCount > 0 ? (
            <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-[--primary] text-[10px] text-[--primary-foreground] flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          ) : null}
        </Link>

        {/* Wallet Button */}
        <WalletButton />
      </div>
    </header>
  );
}
