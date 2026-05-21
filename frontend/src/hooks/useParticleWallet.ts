'use client';

/**
 * Safe wrapper around Particle wallet state.
 * The actual ConnectKit hooks are called inside the provider bridge so pages
 * can read wallet state even when the provider is disabled or not mounted yet.
 */

import { createContext, useContext } from 'react';

export interface WalletContext {
  available: boolean;
  address: string | undefined;
  isConnected: boolean;
  openConnectModal: () => void;
  disconnect: () => void;
  // last wallet-related error (user-facing)
  lastError?: {
    type: 'error' | 'warning'
    message: string
    action?: string
  }
  // retry / reconnect helper exposed to UI
  retryConnect?: () => void;
  reportWalletError?: (error: unknown) => void;
}

const defaultWalletContext: WalletContext = {
  available: false,
  address: undefined,
  isConnected: false,
  openConnectModal: () => {},
  disconnect: () => {},
  lastError: undefined,
  retryConnect: undefined,
  reportWalletError: undefined,
};

export const ParticleWalletContext =
  createContext<WalletContext>(defaultWalletContext);

export function useParticleWallet(): WalletContext {
  return useContext(ParticleWalletContext);
}
