'use client';

/**
 * Safe wrapper around Particle Network's wallet hooks.
 * Returns a consistent interface whether or not the Particle provider
 * is mounted. Falls back gracefully when env vars are not configured.
 */

import {
  useAccount,
  useModal,
  useDisconnect,
} from '@particle-network/connectkit';

export interface WalletContext {
  available: boolean;
  address: string | undefined;
  isConnected: boolean;
  openConnectModal: () => void;
  disconnect: () => void;
}

const hasParticleEnv =
  (process.env.NEXT_PUBLIC_PROJECT_ID ?? '').trim().length > 0;

export function useParticleWallet(): WalletContext {
  const { address, isConnected } = useAccount();
  const { setOpen } = useModal();
  const { disconnect } = useDisconnect();

  if (!hasParticleEnv) {
    return {
      available: false,
      address: undefined,
      isConnected: false,
      openConnectModal: () => {},
      disconnect: () => {},
    };
  }

  return {
    available: true,
    address,
    isConnected: isConnected && !!address,
    openConnectModal: () => setOpen(true),
    disconnect,
  };
}
