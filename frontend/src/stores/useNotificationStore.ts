/**
 * In-app notification centre backed by Zustand.
 *
 * Notifications are stored as a FIFO queue capped at 100 items.
 * New items are prepended (most recent first). The store supports
 * push, read-tracking, and bulk clear for read items.
 *
 * This is NOT the same as the Radix toast system — toasts are
 * ephemeral UI pop-ups, while these notifications persist in the
 * sidebar bell icon until explicitly dismissed.
 */

import { create } from 'zustand';

export type AppNotificationType =
  | 'success'
  | 'info'
  | 'warning'
  | 'error';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: AppNotificationType;
  createdAt: string;
  read: boolean;
}

interface NotificationState {
  items: AppNotification[];
  push: (input: Omit<AppNotification, 'id' | 'createdAt' | 'read'>) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  clearRead: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  items: [],
  push: (input) =>
    set((state) => ({
      items: [
        {
          ...input,
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          createdAt: new Date().toISOString(),
          read: false,
        },
        ...state.items,
      ].slice(0, 100),
    })),
  markRead: (id) =>
    set((state) => ({
      items: state.items.map((item) => (item.id === id ? { ...item, read: true } : item)),
    })),
  markAllRead: () =>
    set((state) => ({
      items: state.items.map((item) => ({ ...item, read: true })),
    })),
  clearRead: () =>
    set((state) => ({
      items: state.items.filter((item) => !item.read),
    })),
}));
