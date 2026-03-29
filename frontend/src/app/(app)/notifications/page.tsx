'use client';

import { motion } from 'framer-motion';
import { staggerContainer, staggerItem } from '@/lib/animations';
import { useNotificationStore } from '@/stores/useNotificationStore';

export default function NotificationsPage() {
  const { items, markRead, markAllRead, clearRead } = useNotificationStore();

  return (
    <motion.main
      className="flex-1 space-y-8 overflow-y-auto p-6"
      initial="initial"
      animate="animate"
      variants={staggerContainer}
    >
      <motion.div className="flex items-center justify-between" variants={staggerItem}>
        <div>
          <h1 className="font-display text-2xl sm:text-3xl text-[--primary]">Notifications</h1>
          <p className="mt-2 text-sm text-[--muted-foreground]">Events for score results, quest updates, loot, and rank shifts</p>
        </div>
        <div className="flex gap-2">
          <button onClick={markAllRead} className="px-3 py-2 rounded border border-[--border] text-xs hover:bg-[--secondary]">Mark all read</button>
          <button onClick={clearRead} className="px-3 py-2 rounded border border-[--border] text-xs hover:bg-[--secondary]">Clear read</button>
        </div>
      </motion.div>

      <motion.section variants={staggerItem} className="space-y-3">
        {items.length === 0 ? (
          <div className="rounded-lg border border-[--border] bg-[--card] p-6 text-sm text-[--muted-foreground]">
            No notifications yet.
          </div>
        ) : (
          items.map((item) => (
            <button
              key={item.id}
              onClick={() => markRead(item.id)}
              className={`w-full text-left rounded-lg border p-4 bg-[--card] transition-colors ${item.read ? 'border-[--border]' : 'border-[--primary]/40'}`}
            >
              <div className="flex items-center justify-between gap-4">
                <p className="font-semibold text-sm">{item.title}</p>
                <p className="text-[10px] text-[--muted-foreground] font-mono">{new Date(item.createdAt).toLocaleString()}</p>
              </div>
              <p className="text-sm text-[--muted-foreground] mt-1">{item.message}</p>
            </button>
          ))
        )}
      </motion.section>
    </motion.main>
  );
}
