'use client';

import { useContext } from 'react';
import { DynamicContext } from '@dynamic-labs/sdk-react-core';

export interface OptionalDynamicContext {
  available: boolean;
  primaryWallet?: {
    address?: string;
    id?: string;
  };
  setShowAuthFlow: (show: boolean) => void;
}

const FALLBACK_DYNAMIC_CONTEXT: OptionalDynamicContext = {
  available: false,
  primaryWallet: undefined,
  setShowAuthFlow: () => {
    // No-op fallback when Dynamic provider is unavailable.
  },
};

const hasDynamicEnvironment =
  (process.env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID ?? '').trim().length > 0;

export function useOptionalDynamicContext(): OptionalDynamicContext {
  const dynamicContext = useContext(DynamicContext);

  if (!hasDynamicEnvironment || !dynamicContext) {
    return FALLBACK_DYNAMIC_CONTEXT;
  }

  return {
    available: true,
    primaryWallet: dynamicContext.primaryWallet ?? undefined,
    setShowAuthFlow: dynamicContext.setShowAuthFlow,
  };
}
