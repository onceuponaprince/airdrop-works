'use client';

import { useState } from 'react';
import { Twitter, MessageCircle, Users, Link as LinkIcon, Unlink, RefreshCw } from 'lucide-react';
import { useSocialAccounts, type SocialAccount } from '@/hooks/useSocialAccounts';
import { api } from '@/lib/api';
import { useNotificationStore } from '@/stores/useNotificationStore';
import { ArcadeButton } from '@/components/themed/ArcadeButton';

function formatRelative(dateStr?: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function getSyncStatus(lastSynced?: string): 'fresh' | 'stale' | 'old' {
  if (!lastSynced) return 'old';
  const mins = (Date.now() - new Date(lastSynced).getTime()) / 60000;
  if (mins < 60) return 'fresh';
  if (mins < 1440) return 'stale';
  return 'old';
}

// Simple Discord channel config (MVP)
function DiscordChannelConfig({ userHasDiscord }: { userHasDiscord: boolean }) {
  const [channels, setChannels] = useState('');
  const [saving, setSaving] = useState(false);
  const notify = useNotificationStore((s) => s.push);

  const save = async () => {
    setSaving(true);
    try {
      const list = channels.split(',').map(c => c.trim()).filter(Boolean);
      await api.post('/auth/discord/channels/', { channel_ids: list });
      notify({ type: 'success', title: 'Channels saved', message: 'The system will now track these channels.' });
    } catch (e) {
      notify({ type: 'error', title: 'Failed to save channels', message: String(e) });
    } finally {
      setSaving(false);
    }
  };

  if (!userHasDiscord) return null;

  return (
    <div className="flex items-center gap-2 text-xs">
      <input
        type="text"
        placeholder="channel IDs (comma separated)"
        value={channels}
        onChange={(e) => setChannels(e.target.value)}
        className="w-40 rounded border border-[--border] bg-[--background] px-2 py-1 font-mono text-[10px]"
      />
      <button
        onClick={save}
        disabled={saving}
        className="rounded border border-[--primary]/60 px-2 py-0.5 text-[--primary] hover:bg-[--primary]/10 disabled:opacity-50"
      >
        {saving ? 'Saving...' : 'Save'}
      </button>
    </div>
  );
}

const PLATFORM_META: Record<SocialAccount['platform'], { label: string; icon: React.ReactNode; placeholder: string }> = {
  twitter: { label: 'Twitter / X', icon: <Twitter size={16} />, placeholder: '@yourhandle' },
  discord: { label: 'Discord', icon: <Users size={16} />, placeholder: 'Your Discord username' },
  telegram: { label: 'Telegram', icon: <MessageCircle size={16} />, placeholder: '@yourusername' },
  github: { label: 'GitHub', icon: <LinkIcon size={16} />, placeholder: 'yourusername' },
};

export function SocialAccountsPanel() {
  const { accounts, connect, disconnect, sync } = useSocialAccounts();
  const notify = useNotificationStore((s) => s.push);
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

  const handleRealOAuth = async (platform: string) => {
    try {
      const res = await api.get<{ authorizeUrl?: string; deepLink?: string }>(
        `/auth/${platform}/start/`
      );
      const url = res.authorizeUrl || res.deepLink;

      if (url) {
        if (platform === 'telegram') {
          // Open Telegram deep link in new tab
          window.open(url, '_blank');
          notify({
            type: 'success',
            title: 'Telegram opened',
            message: 'Start the bot, then come back. Your account will appear shortly.',
          });
        } else {
          window.location.href = url;
        }
      } else {
        notify({ type: 'error', title: 'Connection error', message: 'No redirect URL returned' });
      }
    } catch (err) {
      notify({ type: 'error', title: 'Failed to start connection', message: String(err) });
    }
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
        ) : accounts.isError ? (
          <div className="flex items-center justify-between text-sm text-[--destructive]">
            <span>Failed to load connected accounts.</span>
            <button onClick={() => accounts.refetch()} className="underline flex items-center gap-1">
              <RefreshCw size={14} /> Retry
            </button>
          </div>
        ) : accounts.data && accounts.data.length > 0 ? (
          accounts.data.map((acc) => {
            const status = getSyncStatus(acc.last_synced_at);
            const statusColor =
              status === 'fresh'
                ? 'bg-emerald-500'
                : status === 'stale'
                  ? 'bg-amber-500'
                  : 'bg-[--muted-foreground]';

            return (
              <div
                key={acc.platform}
                className="flex items-center justify-between rounded border border-[--border] bg-[--background]/50 px-4 py-2.5 text-sm"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {PLATFORM_META[acc.platform].icon}
                  <div className="min-w-0">
                    <div className="font-medium flex items-center gap-2">
                      {PLATFORM_META[acc.platform].label}
                      <span className={`inline-block h-1.5 w-1.5 rounded-full ${statusColor}`} />
                    </div>
                    <div className="font-mono text-xs text-[--muted-foreground] truncate">@{acc.username}</div>
                    <div className="text-[10px] text-[--muted-foreground] mt-0.5">
                      Connected {formatRelative(acc.connected_at)}
                      {acc.last_synced_at && (
                        <> · Last synced {formatRelative(acc.last_synced_at)}</>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 ml-2">
                  {acc.platform === 'discord' && (
                    <DiscordChannelConfig userHasDiscord={true} />
                  )}
                  <button
                    onClick={() => disconnect.mutate(acc.platform)}
                    className="text-[--destructive] hover:underline flex items-center gap-1 text-xs"
                  >
                    <Unlink size={14} /> Disconnect
                  </button>
                </div>
              </div>
            );
          })
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

          {['twitter', 'discord'].includes(form.platform) ? (
            <ArcadeButton size="sm" onClick={() => handleRealOAuth(form.platform)}>
              Connect with {PLATFORM_META[form.platform as SocialAccount['platform']].label}
            </ArcadeButton>
          ) : form.platform === 'telegram' ? (
            <ArcadeButton
              size="sm"
              onClick={() => handleRealOAuth('telegram')}
              disabled={connect.isPending}
            >
              Open Telegram Bot
            </ArcadeButton>
          ) : (
            <>
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
                disabled={connect.isPending || !form.username}
              >
                {connect.isPending ? 'Connecting...' : 'Connect Account'}
              </ArcadeButton>
            </>
          )}
        </div>

        <div className="mt-3 flex justify-end">
          <ArcadeButton
            size="sm"
            variant="secondary"
            onClick={() => sync.mutate()}
            disabled={sync.isPending || !accounts.data?.length}
          >
            {sync.isPending ? 'Syncing...' : 'Sync & Score Now'}
          </ArcadeButton>
        </div>

        <p className="mt-2 text-[10px] text-[--muted-foreground]">
          Twitter & Discord use real OAuth. Telegram opens the official bot (deep link) — talk to it to link. Then add the same bot to your groups/channels; posts are scored in real time via webhook + AI Judge.
        </p>
      </div>
    </div>
  );
}