'use client';

import { useState } from 'react';

const CONSENT_KEY = 'airdrop_cookie_consent';

export function CookieConsentBanner() {
  const [consent, setConsent] = useState<string | null>(() => {
    if (typeof window === 'undefined') {
      return null;
    }
    return window.localStorage.getItem(CONSENT_KEY);
  });

  if (consent) {
    return null;
  }

  const persistConsent = (value: 'essential' | 'analytics') => {
    window.localStorage.setItem(CONSENT_KEY, value);
    setConsent(value);
  };

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[120] rounded-lg border border-[--border] bg-[--card] p-4 shadow-xl sm:left-auto sm:max-w-lg">
      <p className="text-sm font-semibold text-[--foreground]">Privacy choices</p>
      <p className="mt-2 text-xs leading-relaxed text-[--muted-foreground]">
        We use essential storage for authentication and security. Optional analytics help us
        understand product usage and improve onboarding.
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={() => persistConsent('essential')}
          className="rounded border border-[--border] px-3 py-2 text-xs font-semibold hover:bg-[--secondary]"
        >
          Essential only
        </button>
        <button
          type="button"
          onClick={() => persistConsent('analytics')}
          className="rounded border border-[--primary] bg-[--primary] px-3 py-2 text-xs font-semibold text-[--primary-foreground]"
        >
          Accept analytics
        </button>
      </div>
    </div>
  );
}

export const cookieConsentStorageKey = CONSENT_KEY;
