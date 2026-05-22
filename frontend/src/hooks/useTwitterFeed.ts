'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export interface TweetIngestedEvent {
  type: 'tweet.ingested' | 'connected';
  contributionId?: string;
  platformContentId?: string;
  text?: string;
  contentUrl?: string;
  sentiment?: { label: string; score: number };
  createdAt?: string;
  message?: string;
}

function wsBaseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_BACKEND_WS_URL;
  if (explicit) return explicit.replace(/\/$/, '');
  const http =
    process.env.NEXT_PUBLIC_BACKEND_URL ??
    process.env.NEXT_PUBLIC_SITE_URL?.replace(':3000', ':8001') ??
    'http://localhost:8001';
  return http.replace(/^http/, 'ws');
}

export function useTwitterFeed(token: string | null, enabled = true) {
  const [events, setEvents] = useState<TweetIngestedEvent[]>([]);
  const [status, setStatus] = useState<'idle' | 'connecting' | 'open' | 'closed' | 'error'>('idle');
  const socketRef = useRef<WebSocket | null>(null);

  const openSocket = useCallback(() => {
    if (!token || !enabled) return;
    socketRef.current?.close();
    const url = `${wsBaseUrl()}/ws/twitter/feed/?token=${encodeURIComponent(token)}`;
    const ws = new WebSocket(url);
    socketRef.current = ws;

    ws.onopen = () => setStatus('open');
    ws.onclose = () => setStatus('closed');
    ws.onerror = () => setStatus('error');
    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as TweetIngestedEvent;
        setEvents((prev) => [payload, ...prev].slice(0, 50));
      } catch {
        /* ignore malformed */
      }
    };
  }, [token, enabled]);

  const reconnect = useCallback(() => {
    if (!token || !enabled) return;
    setStatus('connecting');
    openSocket();
  }, [openSocket, token, enabled]);

  useEffect(() => {
    if (!enabled || !token) {
      socketRef.current?.close();
      return;
    }
    openSocket();
    return () => socketRef.current?.close();
  }, [openSocket, enabled, token]);

  const visibleStatus = enabled && token ? (status === 'idle' ? 'connecting' : status) : 'idle';

  return { events, status: visibleStatus, reconnect };
}
