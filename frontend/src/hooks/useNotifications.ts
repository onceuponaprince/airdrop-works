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
  const items = useNotificationStore((s) => s.items);
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const totalCount = useNotificationStore((s) => s.totalCount);
  const isLoading = useNotificationStore((s) => s.isLoading);
  const error = useNotificationStore((s) => s.error);
  const wsConnected = useNotificationStore((s) => s.wsConnected);
  const connectWebSocket = useNotificationStore((s) => s.connectWebSocket);
  const disconnectWebSocket = useNotificationStore((s) => s.disconnectWebSocket);
  const fetchNotifications = useNotificationStore((s) => s.fetchNotifications);
  const syncUnreadCount = useNotificationStore((s) => s.syncUnreadCount);
  const markRead = useNotificationStore((s) => s.markRead);
  const markAllRead = useNotificationStore((s) => s.markAllRead);
  const deleteNotification = useNotificationStore((s) => s.deleteNotification);
  const pushLocal = useNotificationStore((s) => s.pushLocal);
  const clearRead = useNotificationStore((s) => s.clearRead);

  // Connect WebSocket when token available
  useEffect(() => {
    if (!enabled || !token) {
      disconnectWebSocket();
      return;
    }

    const cleanup = connectWebSocket(token);

    // Initial fetch
    fetchNotifications();

    return cleanup;
  }, [token, enabled, connectWebSocket, disconnectWebSocket, fetchNotifications]);

  // Periodic sync as fallback (in case WebSocket misses something)
  useEffect(() => {
    if (!enabled) return;

    const interval = setInterval(() => {
      syncUnreadCount();
    }, pollInterval);

    return () => clearInterval(interval);
  }, [enabled, pollInterval, syncUnreadCount]);

  // Convenience refresh function
  const refresh = useCallback(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  return {
    notifications: items,
    unreadCount,
    totalCount,
    isLoading,
    error,
    wsConnected,
    markRead,
    markAllRead,
    deleteNotification,
    refresh,
    pushLocal,
    clearRead,
  };
}
