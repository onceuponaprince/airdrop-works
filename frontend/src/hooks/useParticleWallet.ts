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
}

const defaultWalletContext: WalletContext = {
  available: false,
  address: undefined,
  isConnected: false,
  openConnectModal: () => {},
  disconnect: () => {},
};

export const ParticleWalletContext =
  createContext<WalletContext>(defaultWalletContext);

export function useParticleWallet(): WalletContext {
  return useContext(ParticleWalletContext);
}
