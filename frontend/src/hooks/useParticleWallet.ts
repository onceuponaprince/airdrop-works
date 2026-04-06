'use client';

/**
 * Safe wrapper around Particle Network's wallet hooks.
 * Returns a consistent interface whether or not the Particle provider
 * is mounted. Falls back gracefully during SSR and when env vars
 * are not configured.
 *
 * Replaces the previous useOptionalDynamicContext hook.
 */

export interface WalletContext {
  available: boolean;
  address: string | undefined;
  isConnected: boolean;
  openConnectModal: () => void;
  disconnect: () => void;
}

const FALLBACK: WalletContext = {
  available: false,
  address: undefined,
  isConnected: false,
  openConnectModal: () => {},
  disconnect: () => {},
};

const hasParticleEnv =
  (process.env.NEXT_PUBLIC_PROJECT_ID ?? '').trim().length > 0;

export function useParticleWallet(): WalletContext {
  try {
    if (!hasParticleEnv) return FALLBACK;

    // Lazy require to avoid SSR "Store not initialized" crashes
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { useAccount, useModal, useDisconnect } = require('@particle-network/connectkit');

    // eslint-disable-next-line react-hooks/rules-of-hooks
    const { address, isConnected } = useAccount() as { address?: string; isConnected: boolean };
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const { openConnectModal } = useModal() as { openConnectModal: () => void };
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const { disconnect } = useDisconnect() as { disconnect: () => void };

    return {
      available: true,
      address,
      isConnected: isConnected && !!address,
      openConnectModal,
      disconnect,
    };
  } catch {
    return FALLBACK;
  }
}
