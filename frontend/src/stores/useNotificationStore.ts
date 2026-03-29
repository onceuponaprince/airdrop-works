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
