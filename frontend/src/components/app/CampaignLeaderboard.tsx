'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Trophy } from 'lucide-react';

interface CampaignEntry {
  rank: number;
  wallet_address: string;
  display_name: string;
  total_xp: number;
  connected_platforms: string[];
  platform_count: number;
}

export function CampaignLeaderboard() {
  const { data, isLoading } = useQuery<CampaignEntry[]>({
    queryKey: ['campaign-leaderboard'],
    queryFn: () => api.get<CampaignEntry[]>('/leaderboard/multi-platform/'),
  });

  return (
    <div className="rounded-lg border border-[--border] bg-[--card] p-6">
      <div className="flex items-center gap-2 mb-4">
        <Trophy className="text-[--primary]" size={18} />
        <h3 className="font-display text-lg text-[--primary]">Live Campaign Leaderboard</h3>
      </div>

      <p className="text-sm text-[--muted-foreground] mb-4">
        Top contributors across Telegram, Discord, and Twitter.
      </p>

      {isLoading ? (
        <div className="text-sm text-[--muted-foreground]">Loading leaderboard...</div>
      ) : !data || data.length === 0 ? (
        <div className="text-sm text-[--muted-foreground]">No participants yet. Be the first to connect an account!</div>
      ) : (
        <div className="space-y-2">
          {data.slice(0, 10).map((entry) => (
            <div
              key={entry.wallet_address}
              className="flex items-center justify-between rounded border border-[--border] bg-[--background]/50 px-4 py-2 text-sm"
            >
              <div className="flex items-center gap-3">
                <div className="font-mono text-[--primary] w-6">#{entry.rank}</div>
                <div>
                  <div className="font-medium">{entry.display_name}</div>
                  <div className="text-[10px] text-[--muted-foreground] font-mono">
                    {entry.connected_platforms.join(" · ")}
                  </div>
                </div>
              </div>
              <div className="font-mono text-[--primary] text-right">
                {entry.total_xp.toLocaleString()} XP
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}