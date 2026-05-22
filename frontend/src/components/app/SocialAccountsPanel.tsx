'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Twitter, MessageCircle, Users, Link as LinkIcon, Unlink } from 'lucide-react';
import { useSocialAccounts, type SocialAccount } from '@/hooks/useSocialAccounts';
import { ArcadeButton } from '@/components/themed/ArcadeButton';

const PLATFORM_META: Record<SocialAccount['platform'], { label: string; icon: React.ReactNode; placeholder: string }> = {
  twitter: { label: 'Twitter / X', icon: <Twitter size={16} />, placeholder: '@yourhandle' },
  discord: { label: 'Discord', icon: <Users size={16} />, placeholder: 'Your Discord username' },
  telegram: { label: 'Telegram', icon: <MessageCircle size={16} />, placeholder: '@yourusername' },
  github: { label: 'GitHub', icon: <LinkIcon size={16} />, placeholder: 'yourusername' },
};

export function SocialAccountsPanel() {
  const { accounts, connect, disconnect } = useSocialAccounts();
  const [form, setForm] = useState({ platform: 'twitter' as SocialAccount['platform'], username: '', external_id: '' });

  const connectedPlatforms = new Set(accounts.data?.map((a) => a.platform) ?? []);

  const handleConnect = () => {
    if (!form.username && !form.external_id) return;

    connect.mutate({
      platform: form.platform,
      external_id: form.external_id || form.username,
      username: form.username,
      display_name: form.username,
    });

    setForm({ ...form, username: '', external_id: '' });
  };

  return (
    <div className="rounded-lg border border-[--border] bg-[--card] p-6">
      <div className="mb-4 flex items-center gap-2">
        <LinkIcon className="text-[--primary]" size={18} />
        <h3 className="font-display text-lg text-[--primary]">Connected Accounts</h3>
      </div>

      <p className="text-sm text-[--muted-foreground] mb-4">
        Link your social accounts to earn points from your posts and messages across platforms.
      </p>

      {/* Connected accounts list */}
      <div className="space-y-2 mb-6">
        {accounts.isLoading ? (
          <div className="text-sm text-[--muted-foreground]">Loading connections...</div>
        ) : accounts.data && accounts.data.length > 0 ? (
          accounts.data.map((acc) => (
            <div
              key={acc.platform}
              className="flex items-center justify-between rounded border border-[--border] bg-[--background]/50 px-4 py-2 text-sm"
            >
              <div className="flex items-center gap-3">
                {PLATFORM_META[acc.platform].icon}
                <div>
                  <div className="font-medium">{PLATFORM_META[acc.platform].label}</div>
                  <div className="font-mono text-xs text-[--muted-foreground]">@{acc.username}</div>
                </div>
              </div>
              <button
                onClick={() => disconnect.mutate(acc.platform)}
                className="text-[--destructive] hover:underline flex items-center gap-1 text-xs"
              >
                <Unlink size={14} /> Disconnect
              </button>
            </div>
          ))
        ) : (
          <div className="text-sm text-[--muted-foreground] italic">No accounts connected yet.</div>
        )}
      </div>

      {/* Connect new account form */}
      <div className="border-t border-[--border] pt-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <select
            value={form.platform}
            onChange={(e) => setForm({ ...form, platform: e.target.value as any })}
            className="rounded border border-[--border] bg-[--background] px-3 py-2 text-sm"
          >
            {Object.keys(PLATFORM_META).map((p) => (
              <option key={p} value={p}>
                {PLATFORM_META[p as SocialAccount['platform']].label}
              </option>
            ))}
          </select>

          <input
            type="text"
            placeholder={PLATFORM_META[form.platform].placeholder}
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            className="rounded border border-[--border] bg-[--background] px-3 py-2 text-sm font-mono"
          />

          <ArcadeButton
            size="sm"
            onClick={handleConnect}
            disabled={connect.isPending || (!form.username && !form.external_id)}
          >
            {connect.isPending ? 'Connecting...' : 'Connect Account'}
          </ArcadeButton>
        </div>

        <p className="mt-2 text-[10px] text-[--muted-foreground]">
          For now, enter your username or ID. Full OAuth login coming soon.
        </p>
      </div>
    </div>
  );
}