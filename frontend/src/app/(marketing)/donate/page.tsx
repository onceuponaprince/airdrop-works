'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Heart, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react';
import { ArcadeButton } from '@/components/themed/ArcadeButton';
import { ArcadeCard } from '@/components/themed/ArcadeCard';
import { cn } from '@/lib/utils';
import { useDonate, type DonateChain } from '@/hooks/useDonate';

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
  const { status, txHash, error, donate, reset } = useDonate();

  const presets = chain === 'base' ? BASE_PRESETS : SOLANA_PRESETS;
  const unit = chain === 'base' ? 'ETH' : 'SOL';

  const handlePreset = (value: string) => {
    setAmount(value);
    setCustomMode(false);
  };

  const handleDonate = async () => {
    if (!amount || parseFloat(amount) <= 0) return;
    await donate(chain, amount);
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

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <ArcadeCard glow className="space-y-6">
            {/* Chain toggle */}
            <div className="flex gap-1 bg-[--secondary] p-1 rounded-lg">
              <button
                onClick={() => { setChain('base'); setAmount(''); }}
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
                onClick={() => { setChain('solana'); setAmount(''); }}
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

            {/* Success */}
            {status === 'success' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-lg border border-[--primary]/50 bg-[--primary]/10 p-4 text-center"
              >
                <CheckCircle className="mx-auto text-[--primary] mb-2" size={24} />
                <p className="text-sm font-medium text-[--foreground] mb-1">Thank you for your donation!</p>
                {txHash && (
                  <a
                    href={chain === 'base'
                      ? `https://basescan.org/tx/${txHash}`
                      : `https://solscan.io/tx/${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-[--primary] hover:underline"
                  >
                    View transaction <ExternalLink size={10} />
                  </a>
                )}
                <div className="mt-3">
                  <button
                    onClick={reset}
                    className="text-xs text-[--muted-foreground] hover:text-[--foreground] underline"
                  >
                    Make another donation
                  </button>
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
