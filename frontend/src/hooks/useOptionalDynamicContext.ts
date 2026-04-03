'use client';

import { useContext } from 'react';

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

/**
 * Safely access the Dynamic.xyz wallet context. Returns a no-op fallback
 * when the provider isn't mounted (env var missing) or during SSR/static
 * prerendering where the Dynamic SDK store isn't initialized.
 */
export function useOptionalDynamicContext(): OptionalDynamicContext {
  // Dynamic SDK throws "Store not initialized" during SSR prerendering.
  // Lazy-import the context and wrap in try/catch so the build succeeds.
  try {
    if (!hasDynamicEnvironment) return FALLBACK_DYNAMIC_CONTEXT;

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { DynamicContext } = require('@dynamic-labs/sdk-react-core') as {
      DynamicContext: React.Context<{ primaryWallet?: { address?: string; id?: string }; setShowAuthFlow: (show: boolean) => void } | null>;
    };
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const dynamicContext = useContext(DynamicContext);

    if (!dynamicContext) return FALLBACK_DYNAMIC_CONTEXT;

    return {
      available: true,
      primaryWallet: dynamicContext.primaryWallet ?? undefined,
      setShowAuthFlow: dynamicContext.setShowAuthFlow,
    };
  } catch {
    // SSR / static prerender — SDK store not available
    return FALLBACK_DYNAMIC_CONTEXT;
  }
}
