/**
 * In-app notification centre backed by Zustand + Django API + WebSocket.
 *
 * - Notifications persist in Django database for cross-device sync
 * - Real-time updates via WebSocket at /ws/notifications/
 * - Local state mirrors server state with optimistic updates
 * - FIFO queue capped at 100 items per client
 *
 * This is NOT the same as the Radix toast system — toasts are
 * ephemeral UI pop-ups, while these notifications persist in the
 * sidebar bell icon until explicitly dismissed.
 */

import { create } from 'zustand';
import { api } from '@/lib/api';

// Backend notification types
export type BackendNotificationType =
  | 'score_complete'
  | 'appeal_resolved'
  | 'quest_completed'
  | 'quest_accepted'
  | 'loot_ready'
  | 'badge_earned'
  | 'rank_up'
  | 'system';

// Legacy frontend notification types (for local notifications)
export type AppNotificationType =
  | 'success'
  | 'info'
  | 'warning'
  | 'error';

// Combined notification interface
export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: AppNotificationType;
  backendType?: BackendNotificationType;
  createdAt: string;
  read: boolean;
  readAt?: string;
  isBroadcast?: boolean;
  data?: Record<string, unknown>;
  timeSince?: string;
}

// Backend API response types
interface NotificationApiItem {
  id: string;
  notification_type: BackendNotificationType;
  title: string;
  message: string;
  read: boolean;
  read_at: string | null;
  data: Record<string, unknown>;
  is_broadcast: boolean;
  created_at: string;
  updated_at: string;
  time_since: string;
}

interface NotificationListResponse {
  results: NotificationApiItem[];
  summary: {
    unread_count: number;
    total_count: number;
  };
}

interface WebSocketNotificationPayload {
  id: string;
  notification_type: BackendNotificationType;
  title: string;
  message: string;
  read: boolean;
  data: Record<string, unknown>;
  created_at: string;
}

interface NotificationState {
  items: AppNotification[];
  unreadCount: number;
  totalCount: number;
  isLoading: boolean;
  error: string | null;
  wsConnected: boolean;

  // API actions
  fetchNotifications: (filter?: { read?: boolean; type?: string }) => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;

  // WebSocket actions
  connectWebSocket: (token: string) => () => void;
  disconnectWebSocket: () => void;

  // Local actions (fallback for local-only notifications)
  pushLocal: (input: Omit<AppNotification, 'id' | 'createdAt' | 'read'>) => void;
  push: (input: Omit<AppNotification, 'id' | 'createdAt' | 'read'>) => void; // alias for compatibility
  clearRead: () => void;

  // Internal
  addFromWebSocket: (payload: WebSocketNotificationPayload) => void;
  syncUnreadCount: () => Promise<void>;
}

// Helper to map backend type to frontend type
function mapBackendType(backendType: BackendNotificationType): AppNotificationType {
  const mapping: Record<BackendNotificationType, AppNotificationType> = {
    score_complete: 'success',
    appeal_resolved: 'info',
    quest_completed: 'success',
    quest_accepted: 'info',
    loot_ready: 'success',
    badge_earned: 'success',
    rank_up: 'success',
    system: 'info',
  };
  return mapping[backendType] || 'info';
}

// Helper to map API response to AppNotification
function mapNotification(item: NotificationApiItem): AppNotification {
  return {
    id: item.id,
    title: item.title,
    message: item.message,
    type: mapBackendType(item.notification_type),
    backendType: item.notification_type,
    read: item.read,
    readAt: item.read_at || undefined,
    isBroadcast: item.is_broadcast,
    data: item.data,
    createdAt: item.created_at,
    timeSince: item.time_since,
  };
}

// WebSocket base URL helper
function wsBaseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_BACKEND_WS_URL;
  if (explicit) return explicit.replace(/\/\$/, '');
  const http =
    process.env.NEXT_PUBLIC_BACKEND_URL ??
    process.env.NEXT_PUBLIC_SITE_URL?.replace(':3000', ':8001') ??
    'http://localhost:8001';
  return http.replace(/^http/, 'ws');
}

let wsSocket: WebSocket | null = null;

export const useNotificationStore = create<NotificationState>((set, get) => ({
  items: [],
  unreadCount: 0,
  totalCount: 0,
  isLoading: false,
  error: null,
  wsConnected: false,

  // Fetch from API
  fetchNotifications: async (filter) => {
    set({ isLoading: true, error: null });
    try {
      const params = new URLSearchParams();
      if (filter?.read !== undefined) params.set('read', String(filter.read));
      if (filter?.type) params.set('type', filter.type);

      const query = params.toString() ? `?${params.toString()}` : '';
      const response = await api.get<NotificationListResponse>(`/notifications/${query}`);

      const items = response.results.map(mapNotification);

      set({
        items,
        unreadCount: response.summary.unread_count,
        totalCount: response.summary.total_count,
        isLoading: false,
      });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to fetch notifications',
        isLoading: false,
      });
    }
  },

  // Sync just the unread count (lightweight polling)
  syncUnreadCount: async () => {
    try {
      const response = await api.get<{ unread_count: number; total_count: number }>(
        '/notifications/summary/'
      );
      set({
        unreadCount: response.unread_count,
        totalCount: response.total_count,
      });
    } catch {
      // Silent fail for background sync
    }
  },

  // Mark single as read
  markRead: async (id) => {
    // Optimistic update
    set((state) => ({
      items: state.items.map((item) =>
        item.id === id ? { ...item, read: true } : item
      ),
      unreadCount: Math.max(0, get().unreadCount - 1),
    }));

    try {
      await api.post(`/notifications/${id}/read/`);
    } catch {
      // Revert on failure
      get().fetchNotifications();
    }
  },

  // Mark all as read
  markAllRead: async () => {
    // Optimistic update
    set((state) => ({
      items: state.items.map((item) => ({ ...item, read: true })),
      unreadCount: 0,
    }));

    try {
      await api.post('/notifications/mark-all-read/');
    } catch {
      // Revert on failure
      get().fetchNotifications();
    }
  },

  // Delete notification
  deleteNotification: async (id) => {
    // Optimistic update
    const item = get().items.find((i) => i.id === id);
    set((state) => ({
      items: state.items.filter((item) => item.id !== id),
      totalCount: Math.max(0, state.totalCount - 1),
      unreadCount: item?.read ? state.unreadCount : Math.max(0, state.unreadCount - 1),
    }));

    try {
      await api.delete(`/notifications/${id}/`);
    } catch {
      // Revert on failure
      get().fetchNotifications();
    }
  },

  // WebSocket connection
  connectWebSocket: (token) => {
    // Close existing connection
    get().disconnectWebSocket();

    const url = `${wsBaseUrl()}/ws/notifications/?token=${encodeURIComponent(token)}`;
    const ws = new WebSocket(url);
    wsSocket = ws;

    ws.onopen = () => {
      set({ wsConnected: true, error: null });
    };

    ws.onclose = () => {
      set({ wsConnected: false });
    };

    ws.onerror = () => {
      set({ wsConnected: false, error: 'WebSocket connection error' });
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);

        switch (message.type) {
          case 'connected': {
            // Sync unread count on connection
            get().syncUnreadCount();
            break;
          }
          case 'notification.new': {
            get().addFromWebSocket(message.payload);
            break;
          }
          case 'mark_read.confirm': {
            // Already handled optimistically
            break;
          }
          case 'mark_all_read.confirm': {
            // Already handled optimistically
            break;
          }
        }
      } catch {
        // Ignore malformed messages
      }
    };

    // Return cleanup function
    return () => {
      ws.close();
      wsSocket = null;
    };
  },

  disconnectWebSocket: () => {
    if (wsSocket) {
      wsSocket.close();
      wsSocket = null;
    }
    set({ wsConnected: false });
  },

  // Add notification from WebSocket
  addFromWebSocket: (payload) => {
    const notification = mapNotification({
      ...payload,
      read_at: null,
      is_broadcast: false,
      updated_at: payload.created_at,
      time_since: 'just now',
    });

    set((state) => ({
      items: [notification, ...state.items].slice(0, 100),
      unreadCount: state.unreadCount + 1,
      totalCount: state.totalCount + 1,
    }));
  },

  // Push local notification (fallback for immediate feedback)
  pushLocal: (input) => {
    const notification: AppNotification = {
      ...input,
      id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
      read: false,
    };

    set((state) => ({
      items: [notification, ...state.items].slice(0, 100),
      unreadCount: state.unreadCount + 1,
      totalCount: state.totalCount + 1,
    }));
  },

  push: (input) => {
    // Backward-compatible alias for components still calling .push()
    get().pushLocal(input);
  },

  // Clear read notifications locally
  clearRead: () => {
    set((state) => ({
      items: state.items.filter((item) => !item.read),
    }));
  },
}));
