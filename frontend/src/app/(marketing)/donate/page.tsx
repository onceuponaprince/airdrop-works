'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Heart, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react';
import { ArcadeButton } from '@/components/themed/ArcadeButton';
import { ArcadeCard } from '@/components/themed/ArcadeCard';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useDonate, type DonateChain } from '@/hooks/useDonate';
import { events } from '@/lib/analytics';
import { getInjectedSolanaProvider } from '@/lib/solana-wallet';

const BASE_PRESETS = [
  { label: '0.01 ETH', value: '0.01' },
  { label: '0.05 ETH', value: '0.05' },
  { label: '0.1 ETH', value: '0.1' },
];

const SOLANA_PRESETS = [
  { label: '0.5 SOL', value: '0.5' },
  { label: '1 SOL', value: '1' },
  { label: '5 SOL', value: '5' },
];

export default function DonatePage() {
  const [chain, setChain] = useState<DonateChain>('base');
  const [amount, setAmount] = useState('');
  const [customMode, setCustomMode] = useState(false);
  const [solanaAddress, setSolanaAddress] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const { status, txHash, error, donate, reset } = useDonate();

  const presets = chain === 'base' ? BASE_PRESETS : SOLANA_PRESETS;
  const unit = chain === 'base' ? 'ETH' : 'SOL';

  const handlePreset = (value: string) => {
    setAmount(value);
    setCustomMode(false);
  };

  const handleDonate = async () => {
    if (!amount || parseFloat(amount) <= 0) return;
    events.donateStarted(chain, amount);
    await donate(chain, amount);
  };

  useEffect(() => {
    if (status === 'success' && txHash) {
      events.donateSuccess(chain, amount, txHash);
    }
  }, [status, txHash, chain, amount]);

  // Clear Solana address when switching away from Solana tab
  const handleChainChange = (newChain: DonateChain) => {
    if (newChain !== 'solana') {
      setSolanaAddress(null);
    }
    setChain(newChain);
    setAmount('');
  };

  return (
    <section className="py-24 px-4">
      <div className="max-w-lg mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <Heart className="mx-auto text-primary mb-4" size={40} />
          <h1 className="font-display text-3xl text-primary mb-3">Support AI(r)Drop</h1>
          <p className="font-body text-muted-foreground text-sm max-w-md mx-auto">
            Help us build the fairest airdrop scoring platform in Web3. Every donation fuels
            development, infrastructure, and the open-source mission.
          </p>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-6 text-center text-xs text-[--muted-foreground]"
        >
          Donations settle on <span className="text-[--primary] font-mono">Base mainnet</span> (ETH) and{' '}
          <span className="text-[--primary] font-mono">Solana mainnet</span> (SOL). Use the same wallet you connect in the nav.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <ArcadeCard glow className="space-y-6">
            {/* Chain toggle - Solana now supported via @solana/web3.js + wallet adapter */}
            <div className="flex gap-1 bg-[--secondary] p-1 rounded-lg">
              <button
                onClick={() => handleChainChange('base')}
                className={cn(
                  'flex-1 py-2 rounded text-sm font-medium transition-colors',
                  chain === 'base'
                    ? 'bg-[--card] text-[--foreground] shadow-sm'
                    : 'text-[--muted-foreground] hover:text-[--foreground]'
                )}
              >
                Base (ETH)
              </button>
              <button
                onClick={() => handleChainChange('solana')}
                className={cn(
                  'flex-1 py-2 rounded text-sm font-medium transition-colors',
                  chain === 'solana'
                    ? 'bg-[--card] text-[--foreground] shadow-sm'
                    : 'text-[--muted-foreground] hover:text-[--foreground]'
                )}
              >
                Solana (SOL)
              </button>
            </div>

            {/* Solana wallet connect helper / indicator */}
            {chain === 'solana' && (
              solanaAddress ? (
                <button
                  onClick={async () => {
                    await navigator.clipboard.writeText(solanaAddress);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  }}
                  className="flex w-full items-center justify-between rounded-lg border border-[--primary]/50 bg-[--primary]/10 px-4 py-2 text-sm transition hover:border-[--primary]/70 hover:bg-[--primary]/15"
                >
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-[--primary] animate-pulse" />
                    <span className="font-mono text-[--primary]">
                      {solanaAddress.slice(0, 4)}...{solanaAddress.slice(-4)}
                    </span>
                  </div>
                  <span className="text-xs text-[--muted-foreground]">
                    {copied ? 'Copied!' : 'Connected'}
                  </span>
                </button>
              ) : (
                <button
                  onClick={async () => {
                    const provider = getInjectedSolanaProvider();
                    if (provider) {
                      try {
                        const resp = await provider.connect();
                        const addr = resp?.publicKey?.toString() || provider.publicKey?.toString();
                        if (addr) setSolanaAddress(addr);
                      } catch {
                        // wallet will show its own error
                      }
                    } else {
                      window.open('https://phantom.app/', '_blank');
                    }
                  }}
                  className="w-full rounded-lg border border-[--primary]/60 bg-[--primary]/5 py-2 text-sm font-medium text-[--primary] hover:bg-[--primary]/10 transition"
                >
                  Connect Phantom / Solflare
                </button>
              )
            )}

            {/* Preset amounts */}
            <div className="grid grid-cols-3 gap-2">
              {presets.map((p) => (
                <button
                  key={p.value}
                  onClick={() => handlePreset(p.value)}
                  className={cn(
                    'py-3 rounded-lg border text-sm font-mono transition-all',
                    amount === p.value && !customMode
                      ? 'border-[--primary] bg-[--primary]/10 text-[--primary]'
                      : 'border-[--border] text-[--muted-foreground] hover:border-[--primary]/50 hover:text-[--foreground]'
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Custom amount */}
            <div>
              <button
                onClick={() => { setCustomMode(true); setAmount(''); }}
                className="text-xs text-[--muted-foreground] hover:text-[--primary] transition-colors mb-2"
              >
                Enter custom amount
              </button>
              {customMode && (
                <div className="relative">
                  <input
                    type="number"
                    step="0.001"
                    min="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder={`0.00 ${unit}`}
                    className="w-full rounded-lg border border-[--border] bg-[--card] px-4 py-3 text-sm text-[--foreground] placeholder:text-[--muted-foreground] focus:outline-none focus:ring-2 focus:ring-[--ring] font-mono"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-[--muted-foreground]">
                    {unit}
                  </span>
                </div>
              )}
            </div>

            {/* Donate button */}
            <ArcadeButton
              variant="primary"
              className="w-full"
              loading={status === 'pending' || status === 'confirming'}
              disabled={!amount || parseFloat(amount) <= 0 || status === 'pending' || status === 'confirming'}
              onClick={handleDonate}
              icon={<Heart size={16} />}
            >
              {status === 'pending'
                ? 'Confirm in wallet...'
                : status === 'confirming'
                  ? 'Confirming...'
                  : `Donate ${amount || '0'} ${unit}`}
            </ArcadeButton>

            {/* Success Receipt */}
            {status === 'success' && txHash && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-lg border border-[--primary] bg-[--card] p-5 text-left"
              >
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle className="text-[--primary]" size={20} />
                  <p className="font-display text-sm text-[--primary]">Donation Receipt</p>
                </div>

                <div className="space-y-2 text-sm mb-4">
                  <div className="flex justify-between">
                    <span className="text-[--muted-foreground]">Chain</span>
                    <span className="font-mono text-[--foreground]">{chain === 'base' ? 'Base' : 'Solana'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[--muted-foreground]">Amount</span>
                    <span className="font-mono text-[--primary]">{amount} {unit}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[--muted-foreground]">Transaction</span>
                    <div className="flex items-center gap-2">
                      <code className="font-mono text-xs bg-[--secondary] px-1.5 py-0.5 rounded">
                        {txHash.slice(0, 6)}...{txHash.slice(-4)}
                      </code>
                      <button
                        onClick={() => navigator.clipboard.writeText(txHash)}
                        className="text-[--primary] hover:underline text-xs"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                </div>

                <a
                  href={chain === 'base'
                    ? `https://basescan.org/tx/${txHash}`
                    : `https://solscan.io/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 w-full justify-center rounded bg-[--primary] px-4 py-2 text-sm font-medium text-[--primary-foreground] hover:brightness-105 transition"
                >
                  View on {chain === 'base' ? 'BaseScan' : 'Solscan'} <ExternalLink size={14} />
                </a>

                <button
                  onClick={reset}
                  className="mt-3 w-full text-center text-xs text-[--muted-foreground] hover:text-[--foreground] underline"
                >
                  Make another donation
                </button>
                <div className="mt-4 pt-4 border-t border-[--border] text-center space-y-2">
                  <p className="text-xs text-[--muted-foreground]">
                    Want early access to the full platform? Join the waitlist — separate from your donation.
                  </p>
                  <Link
                    href="/#waitlist"
                    className="inline-flex items-center justify-center rounded bg-[--secondary] px-4 py-2 text-sm font-medium hover:bg-[--secondary]/80 transition"
                  >
                    Join the waitlist
                  </Link>
                </div>
              </motion.div>
            )}

            {/* Error */}
            {status === 'error' && error && (
              <div className="rounded-lg border border-[--destructive]/50 bg-[--destructive]/10 p-3">
                <div className="flex items-start gap-2">
                  <AlertCircle size={16} className="text-[--destructive] shrink-0 mt-0.5" />
                  <p className="text-xs text-[--destructive]">{error}</p>
                </div>
              </div>
            )}
          </ArcadeCard>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-center text-xs text-[--muted-foreground] mt-6"
        >
          All donations go directly to the AI(r)Drop development fund.
          <br />
          Connect your wallet using the button in the navigation to donate.
        </motion.p>
      </div>
    </section>
  );
}
