'use client';

import { Wallet } from 'lucide-react';
import clsx from 'clsx';
import { useParticleWallet } from '@/hooks/useParticleWallet';

export function WalletButton() {
  const { available, address, isConnected, openConnectModal } = useParticleWallet();

  const truncated = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : null;

  if (!available) {
    return (
      <button
        disabled
        className="px-4 py-2 rounded border border-[--border] text-[--muted-foreground] text-sm font-medium flex items-center gap-2 opacity-60 cursor-not-allowed"
        title="Wallet provider is not configured"
      >
        <Wallet size={16} />
        Wallet Unavailable
      </button>
    );
  }

  if (!isConnected || !truncated) {
    return (
      <button
        onClick={openConnectModal}
        className="px-4 py-2 rounded border border-[--primary] text-[--primary] text-sm font-medium hover:bg-[--primary] hover:text-[--primary-foreground] transition-colors flex items-center gap-2"
      >
        <Wallet size={16} />
        Connect
      </button>
    );
  }

  return (
    <button
      onClick={openConnectModal}
      className={clsx(
        'px-4 py-2 rounded border text-sm font-medium flex items-center gap-2',
        'border-[--primary] text-[--primary-foreground] bg-[--primary] hover:opacity-90 transition-opacity'
      )}
    >
      <Wallet size={16} />
      {truncated}
    </button>
  );
}
