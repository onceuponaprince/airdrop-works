'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { Logo } from '@/components/shared/Logo';
import { Menu, X } from 'lucide-react';
import clsx from 'clsx';
import { api } from '@/lib/api';

// HANDOVER: Keep this as the single source of truth for app navigation labels/routes.
// If route groups change, update this list and (app)/layout.tsx together.
const NAVIGATION: {
  label: string;
  href: string;
  icon?: string;
}[] = [
  { label: 'AI Judge', href: '/judge' },
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Quests', href: '/quests' },
  { label: 'Leaderboard', href: '/leaderboard' },
  { label: 'Referrals', href: '/referrals' },
  { label: 'Skill Tree', href: '/skill-tree' },
  { label: 'Loot', href: '/loot' },
  { label: 'Notifications', href: '/notifications' },
  { label: 'Sources', href: '/sources' },
  { label: 'Observability', href: '/observability' },
  { label: 'SPORE Lab', href: '/spore-lab' },
  { label: 'Onboarding', href: '/onboarding' },
  { label: 'Admin', href: '/admin' },
  { label: 'Settings', href: '/settings' },
];

export function AppSidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [isStaff, setIsStaff] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadRole = async () => {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        if (mounted) setIsStaff(false);
        return;
      }

      try {
        api.setToken(token);
        const profile = await api.get<{ isStaff?: boolean }>('/auth/me/');
        if (mounted) setIsStaff(Boolean(profile.isStaff));
      } catch {
        if (mounted) setIsStaff(false);
      }
    };

    loadRole();
    return () => {
      mounted = false;
    };
  }, []);

  const visibleNavigation = useMemo(
    () => NAVIGATION.filter((item) => item.href !== '/admin' || isStaff),
    [isStaff]
  );

  return (
    <>
      {/* Mobile menu button */}
      <button
        className="fixed top-4 left-4 z-50 lg:hidden p-2 rounded border border-[--border] hover:bg-[--secondary]"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Sidebar backdrop (mobile) */}
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <motion.aside
        className={clsx(
          'fixed left-0 top-0 h-screen w-64 border-r border-[--border] bg-[--card] p-4 overflow-y-auto z-40 lg:relative lg:z-auto',
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
        initial={false}
        animate={{ x: isOpen ? 0 : -256 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        {/* Logo */}
        <div className="mb-8">
          <Logo />
        </div>

        {/* Navigation */}
        <nav className="space-y-2">
          {visibleNavigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsOpen(false)}
                className={clsx(
                  'block px-4 py-2 rounded text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-[--primary] text-[--primary-foreground]'
                    : 'text-[--muted-foreground] hover:bg-[--secondary] hover:text-[--foreground]'
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </motion.aside>
    </>
  );
}
