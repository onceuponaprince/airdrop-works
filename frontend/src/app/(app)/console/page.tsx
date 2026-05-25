'use client';

import { useEffect, useState } from 'react';
import { Download, Shield, Users, AlertTriangle, BarChart3 } from 'lucide-react';
import {
  useProtocolConsole,
  type AllocationPreset,
  type ConsoleOverview,
  type ConsoleWalletRow,
} from '@/hooks/useProtocolConsole';
import { cn } from '@/lib/utils';

const TIER_STYLES: Record<string, string> = {
  A: 'bg-primary/15 text-primary border-primary/30',
  B: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  C: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  exclude: 'bg-destructive/15 text-destructive border-destructive/30',
};

export default function IntegrityConsolePage() {
  const { loading, error, loadOverview, loadWallets, loadPresets, downloadExport } =
    useProtocolConsole();
  const [overview, setOverview] = useState<ConsoleOverview | null>(null);
  const [wallets, setWallets] = useState<ConsoleWalletRow[]>([]);
  const [presets, setPresets] = useState<AllocationPreset[]>([]);
  const [preset, setPreset] = useState('airdrop_strict');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const [ov, presetData] = await Promise.all([loadOverview(), loadPresets()]);
        setOverview(ov);
        setPresets(presetData.presets);
        setPreset(presetData.defaultPreset);
      } catch {
        /* hook sets error */
      }
    })();
  }, [loadOverview, loadPresets]);

  useEffect(() => {
    void loadWallets(preset).then((data) => setWallets(data.results)).catch(() => undefined);
  }, [preset, loadWallets]);

  const handleExport = async () => {
    setExporting(true);
    try {
      await downloadExport(preset);
    } finally {
      setExporting(false);
    }
  };

  const activePreset = presets.find((p) => p.key === preset);

  return (
    <div className="h-full overflow-y-auto bg-background">
      <div className="max-w-6xl mx-auto p-6 sm:p-8 space-y-8">
        <header className="border-b border-border pb-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">
            Protocol operators
          </p>
          <h1 className="font-heading text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-2">
            <Shield size={22} className="text-primary" />
            Integrity Console
          </h1>
          <p className="font-body text-sm text-muted-foreground mt-2 max-w-2xl">
            Review wallet scores, farming rates, and export tier recommendations for your pilot
            allocation committee. Passport filters humans — this filters farmers.
          </p>
        </header>

        {error ? (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        {overview ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={Users} label="Wallets scored" value={overview.walletsWithScores} />
            <StatCard icon={BarChart3} label="Avg composite" value={overview.averageCompositeScore} />
            <StatCard icon={AlertTriangle} label="Farming rate" value={`${overview.farmingRatePercent}%`} />
            <StatCard icon={Shield} label="Pending appeals" value={overview.pendingAppeals} />
          </div>
        ) : null}

        <section className="rounded-lg border border-border bg-card p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <h2 className="font-heading text-lg font-semibold">Allocation export</h2>
              {activePreset ? (
                <p className="text-sm text-muted-foreground mt-1 max-w-xl">{activePreset.description}</p>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={preset}
                onChange={(e) => setPreset(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                {presets.map((p) => (
                  <option key={p.key} value={p.key}>
                    {p.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => void handleExport()}
                disabled={exporting || loading}
                className="inline-flex items-center gap-2 h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
              >
                <Download size={14} />
                {exporting ? 'Exporting…' : 'Download CSV'}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="py-2 pr-4 font-mono text-[10px] uppercase">Wallet</th>
                  <th className="py-2 pr-4 font-mono text-[10px] uppercase">Score</th>
                  <th className="py-2 pr-4 font-mono text-[10px] uppercase">Farming</th>
                  <th className="py-2 pr-4 font-mono text-[10px] uppercase">Tier</th>
                  <th className="py-2 font-mono text-[10px] uppercase">Weight</th>
                </tr>
              </thead>
              <tbody>
                {loading && wallets.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-muted-foreground">
                      Loading wallets…
                    </td>
                  </tr>
                ) : wallets.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-muted-foreground">
                      No scored wallets yet. Run seed_demo or connect crawl sources.
                    </td>
                  </tr>
                ) : (
                  wallets.map((row) => (
                    <tr key={row.walletAddress} className="border-b border-border/60">
                      <td className="py-2 pr-4 font-mono text-xs">{shortWallet(row.walletAddress)}</td>
                      <td className="py-2 pr-4 tabular">{row.compositeScore}</td>
                      <td className="py-2 pr-4">
                        <span className="tabular">{row.farmingPercentage}%</span>
                        <span className="ml-2 text-xs text-muted-foreground capitalize">{row.farmingFlag}</span>
                      </td>
                      <td className="py-2 pr-4">
                        {row.tier ? (
                          <span
                            className={cn(
                              'inline-flex px-2 py-0.5 rounded border text-xs font-mono',
                              TIER_STYLES[row.tier] ?? TIER_STYLES.exclude
                            )}
                          >
                            {row.tier}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="py-2 tabular">{row.allocationWeight ?? '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users;
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-muted-foreground mb-2">
        <Icon size={14} />
        <span className="font-mono text-[10px] uppercase tracking-wider">{label}</span>
      </div>
      <p className="font-heading text-2xl font-bold tabular">{value}</p>
    </div>
  );
}

function shortWallet(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}
