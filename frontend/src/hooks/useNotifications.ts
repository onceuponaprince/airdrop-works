'use client';

/**
 * React hook for notification management with WebSocket integration.
 *
 * Combines the Zustand store with React lifecycle for automatic
 * WebSocket connection and periodic sync.
 */

import { useEffect, useCallback } from 'react';
import { useNotificationStore } from '@/stores/useNotificationStore';

interface UseNotificationsOptions {
  token: string | null;
  enabled?: boolean;
  pollInterval?: number;
}

export function useNotifications({
  token,
  enabled = true,
  pollInterval = 60000, // 1 minute polling as fallback
}: UseNotificationsOptions) {
  const store = useNotificationStore();

  // Connect WebSocket when token available
  useEffect(() => {
    if (!enabled || !token) {
      store.disconnectWebSocket();
      return;
    }

    const cleanup = store.connectWebSocket(token);

    // Initial fetch
    store.fetchNotifications();

    return cleanup;
  }, [token, enabled, store.connectWebSocket, store.disconnectWebSocket, store.fetchNotifications]);

  // Periodic sync as fallback (in case WebSocket misses something)
  useEffect(() => {
    if (!enabled) return;

    const interval = setInterval(() => {
      store.syncUnreadCount();
    }, pollInterval);

    return () => clearInterval(interval);
  }, [enabled, pollInterval, store.syncUnreadCount]);

  // Convenience refresh function
  const refresh = useCallback(() => {
    store.fetchNotifications();
  }, [store.fetchNotifications]);

  return {
    notifications: store.items,
    unreadCount: store.unreadCount,
    totalCount: store.totalCount,
    isLoading: store.isLoading,
    error: store.error,
    wsConnected: store.wsConnected,
    markRead: store.markRead,
    markAllRead: store.markAllRead,
    deleteNotification: store.deleteNotification,
    refresh,
    pushLocal: store.pushLocal,
    clearRead: store.clearRead,
  };
}
