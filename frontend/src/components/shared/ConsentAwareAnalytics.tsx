'use client';

import { useState } from 'react';
import Script from 'next/script';
import { cookieConsentStorageKey } from '@/components/shared/CookieConsentBanner';

export function ConsentAwareAnalytics({ gaId }: { gaId: string }) {
  const [enabled] = useState(() => {
    if (typeof window === 'undefined') {
      return false;
    }
    return window.localStorage.getItem(cookieConsentStorageKey) === 'analytics';
  });

  if (!enabled || !gaId) {
    return null;
  }

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
        strategy="afterInteractive"
      />
      <Script id="ga-init" strategy="afterInteractive">{`
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag("js", new Date());
        gtag("config", "${gaId}");
      `}</Script>
    </>
  );
}
