'use client';

import { useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { staggerContainer, staggerItem } from '@/lib/animations';
import { api } from '@/lib/api';
import { useNotificationStore } from '@/stores/useNotificationStore';
import type { SubscriptionStatusResponse, SporeTenantContextResponse } from '@/types/api';

interface SubscriptionStatusWire {
  tenant_slug: string;
  plan: 'starter' | 'growth' | 'enterprise' | null;
  status: 'active' | 'cancelled' | 'past_due' | 'trialing' | 'incomplete' | 'none';
  portal_available: boolean;
  cancel_at_period_end: boolean;
  current_period_end: string | null;
}

interface UserWire {
  id: string;
  walletAddress: string;
  email?: string;
  displayName?: string;
  avatarUrl?: string;
  shortAddress?: string;
  isStaff?: boolean;
  createdAt: string;
}

interface SporeTenantWire {
  id: string;
  slug: string;
  name: string;
  is_active: boolean;
  plan: string;
  quota_daily_query: number;
  quota_daily_ingest: number;
  quota_daily_relationship: number;
  quota_daily_brief_generate: number;
  metadata: Record<string, unknown>;
}

interface SporeTenantContextResponseWire {
  active_tenant: SporeTenantWire;
  memberships: Array<{
    tenant: SporeTenantWire;
    role: 'owner' | 'admin' | 'member' | 'viewer';
  }>;
}

export default function SettingsPage() {
  const notify = useNotificationStore((s) => s.push);

  useEffect(() => {
    const billingState = new URLSearchParams(window.location.search).get('billing');
    if (billingState === 'success') {
      notify({
        type: 'success',
        title: 'Billing updated',
        message: 'Stripe checkout completed. Subscription status will refresh shortly.',
      });
    }
    if (billingState === 'cancelled') {
      notify({
        type: 'info',
        title: 'Checkout cancelled',
        message: 'No billing changes were applied.',
      });
    }
  }, [notify]);

  const profile = useQuery({
    queryKey: ['settings', 'profile'],
    queryFn: async () => {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('Connect wallet and authenticate to access settings.');
      }
      api.setToken(token);
      return api.get<UserWire>('/auth/me/');
    },
    retry: false,
  });

  const tenantContext = useQuery({
    queryKey: ['settings', 'tenant-context'],
    queryFn: async () => {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('Connect wallet and authenticate to access tenant settings.');
      }
      api.setToken(token);
      const raw = await api.get<SporeTenantContextResponseWire>('/spore/ops/tenant-context/');
      return {
        activeTenant: mapTenant(raw.active_tenant),
        memberships: raw.memberships.map((membership) => ({
          tenant: mapTenant(membership.tenant),
          role: membership.role,
        })),
      } satisfies SporeTenantContextResponse;
    },
    retry: false,
  });

  const subscription = useQuery({
    queryKey: ['settings', 'subscription', tenantContext.data?.activeTenant.slug],
    queryFn: async () => {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('Connect wallet and authenticate to access billing settings.');
      }
      const activeTenantSlug = tenantContext.data?.activeTenant.slug;
      if (!activeTenantSlug) {
        throw new Error('No active tenant found for billing.');
      }
      api.setToken(token);
      const raw = await api.get<SubscriptionStatusWire>(
        `/payments/subscription/?tenant_slug=${encodeURIComponent(activeTenantSlug)}`
      );
      return {
        tenantSlug: raw.tenant_slug,
        plan: raw.plan,
        status: raw.status,
        portalAvailable: raw.portal_available,
        cancelAtPeriodEnd: raw.cancel_at_period_end,
        currentPeriodEnd: raw.current_period_end,
      } satisfies SubscriptionStatusResponse;
    },
    enabled: Boolean(tenantContext.data?.activeTenant.slug),
    retry: false,
  });

  const createCheckout = useMutation({
    mutationFn: async (plan: 'starter' | 'growth' | 'enterprise') => {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('Authenticate before starting checkout.');
      }
      const activeTenantSlug = tenantContext.data?.activeTenant.slug;
      if (!activeTenantSlug) {
        throw new Error('No active tenant found for billing.');
      }
      api.setToken(token);
      return api.post<{ checkout_url: string }>('/payments/create-checkout-session/', {
        tenant_slug: activeTenantSlug,
        plan,
      });
    },
    onSuccess: (data) => {
      window.location.href = data.checkout_url;
    },
    onError: (error) => {
      notify({
        type: 'error',
        title: 'Checkout failed',
        message: error instanceof Error ? error.message : 'Unable to start Stripe checkout.',
      });
    },
  });

  const createPortal = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('Authenticate before opening billing portal.');
      }
      const activeTenantSlug = tenantContext.data?.activeTenant.slug;
      if (!activeTenantSlug) {
        throw new Error('No active tenant found for billing.');
      }
      api.setToken(token);
      return api.post<{ portal_url: string }>('/payments/create-portal-session/', {
        tenant_slug: activeTenantSlug,
      });
    },
    onSuccess: (data) => {
      window.location.href = data.portal_url;
    },
    onError: (error) => {
      notify({
        type: 'error',
        title: 'Portal failed',
        message: error instanceof Error ? error.message : 'Unable to open Stripe billing portal.',
      });
    },
  });

  const exportAccountData = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('Authenticate before exporting your data.');
      }
      api.setToken(token);
      return api.get<Record<string, unknown>>('/auth/me/export/');
    },
    onSuccess: (data) => {
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json;charset=utf-8;',
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'airdrop-works-account-export.json';
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
      notify({
        type: 'success',
        title: 'Export ready',
        message: 'Your account export has been downloaded.',
      });
    },
    onError: (error) => {
      notify({
        type: 'error',
        title: 'Export failed',
        message: error instanceof Error ? error.message : 'Unable to export account data.',
      });
    },
  });

  const deleteAccount = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('Authenticate before deleting your account.');
      }
      api.setToken(token);
      return api.delete('/auth/me/delete/');
    },
    onSuccess: () => {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('refresh_token');
      window.location.href = '/';
    },
    onError: (error) => {
      notify({
        type: 'error',
        title: 'Delete failed',
        message: error instanceof Error ? error.message : 'Unable to delete account.',
      });
    },
  });

  const account = profile.data;
  const activeTenant = tenantContext.data?.activeTenant;

  return (
    <motion.main
      className="flex-1 space-y-8 overflow-y-auto p-6 max-w-2xl"
      initial="initial"
      animate="animate"
      variants={staggerContainer}
    >
      {/* Header */}
      <motion.div variants={staggerItem}>
        <h1 className="font-display text-2xl sm:text-3xl text-[--primary]">
          Settings
        </h1>
        <p className="mt-2 text-sm text-[--muted-foreground]">
          Manage your account and preferences
        </p>
      </motion.div>

      {/* Account Section */}
      <motion.section className="space-y-4" variants={staggerItem}>
        <h2 className="text-lg font-bold font-heading">Account</h2>
        <div className="rounded-lg border border-[--border] bg-[--card] p-6 space-y-4">
          <div>
            <label className="text-sm font-medium">Wallet Address</label>
            <p className="text-[--muted-foreground] text-sm mt-1 break-all font-mono">
              {account?.walletAddress || 'Not connected'}
            </p>
          </div>
          <div>
            <label className="text-sm font-medium">Email</label>
            <p className="text-[--muted-foreground] text-sm mt-1">
              {account?.email || 'No email on file'}
            </p>
          </div>
          <div>
            <label className="text-sm font-medium">Display Name</label>
            <p className="text-[--muted-foreground] text-sm mt-1">
              {account?.displayName || 'Unnamed user'}
            </p>
          </div>
        </div>
      </motion.section>

      <motion.section className="space-y-4" variants={staggerItem}>
        <h2 className="text-lg font-bold font-heading">Tenant & Billing</h2>
        <div className="rounded-lg border border-[--border] bg-[--card] p-6 space-y-4">
          <div>
            <label className="text-sm font-medium">Active Tenant</label>
            <p className="text-[--muted-foreground] text-sm mt-1">
              {activeTenant ? `${activeTenant.name} (${activeTenant.slug})` : 'No active tenant'}
            </p>
          </div>
          <div>
            <label className="text-sm font-medium">Current Plan</label>
            <p className="text-[--muted-foreground] text-sm mt-1">
              {subscription.data?.plan || activeTenant?.plan || 'starter'} / status{' '}
              {subscription.data?.status || 'none'}
            </p>
          </div>
          <div>
            <label className="text-sm font-medium">Daily Quotas</label>
            <p className="text-[--muted-foreground] text-sm mt-1">
              query {activeTenant?.quotaDailyQuery ?? 0}, ingest {activeTenant?.quotaDailyIngest ?? 0},
              relationship {activeTenant?.quotaDailyRelationship ?? 0}, brief{' '}
              {activeTenant?.quotaDailyBriefGenerate ?? 0}
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <button
              type="button"
              onClick={() => createCheckout.mutate('starter')}
              disabled={createCheckout.isPending}
              className="rounded border border-[--border] px-3 py-2 text-sm font-semibold hover:bg-[--secondary] disabled:opacity-60"
            >
              Starter
            </button>
            <button
              type="button"
              onClick={() => createCheckout.mutate('growth')}
              disabled={createCheckout.isPending}
              className="rounded border border-[--primary] bg-[--primary] px-3 py-2 text-sm font-semibold text-[--primary-foreground] disabled:opacity-60"
            >
              Growth
            </button>
            <button
              type="button"
              onClick={() => createCheckout.mutate('enterprise')}
              disabled={createCheckout.isPending}
              className="rounded border border-[--border] px-3 py-2 text-sm font-semibold hover:bg-[--secondary] disabled:opacity-60"
            >
              Enterprise
            </button>
          </div>
          <button
            type="button"
            onClick={() => createPortal.mutate()}
            disabled={!subscription.data?.portalAvailable || createPortal.isPending}
            className="w-full rounded border border-[--border] px-4 py-2 text-sm font-semibold hover:bg-[--secondary] disabled:opacity-60"
          >
            {createPortal.isPending ? 'Opening portal...' : 'Manage Billing'}
          </button>
        </div>
      </motion.section>

      <motion.section className="space-y-4" variants={staggerItem}>
        <h2 className="text-lg font-bold font-heading">Preferences</h2>
        <div className="rounded-lg border border-[--border] bg-[--card] p-6 space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Email Notifications</label>
            <input type="checkbox" className="rounded" defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Marketing Emails</label>
            <input type="checkbox" className="rounded" />
          </div>
        </div>
      </motion.section>

      <motion.section className="space-y-4" variants={staggerItem}>
        <h2 className="text-lg font-bold font-heading text-[--destructive]">Danger Zone</h2>
        <div className="rounded-lg border border-[--destructive] bg-[--card] p-6 space-y-4">
          <button
            type="button"
            onClick={() => exportAccountData.mutate()}
            disabled={exportAccountData.isPending}
            className="w-full px-4 py-2 rounded border border-[--border] text-[--foreground] hover:bg-[--secondary] transition-colors disabled:opacity-60"
          >
            {exportAccountData.isPending ? 'Exporting Account Data...' : 'Export My Data'}
          </button>
          <button
            type="button"
            onClick={() => {
              localStorage.removeItem('auth_token');
              localStorage.removeItem('refresh_token');
              window.location.href = '/login';
            }}
            className="w-full px-4 py-2 rounded border border-[--destructive] text-[--destructive] hover:bg-[--destructive] hover:text-[--destructive-foreground] transition-colors"
          >
            Disconnect Wallet
          </button>
          <button
            type="button"
            onClick={() => {
              const confirmed = window.confirm(
                'Delete your account and associated records? This action cannot be undone.'
              );
              if (confirmed) {
                deleteAccount.mutate();
              }
            }}
            disabled={deleteAccount.isPending}
            className="w-full px-4 py-2 rounded border border-[--destructive] text-[--destructive] hover:bg-[--destructive] hover:text-[--destructive-foreground] transition-colors disabled:opacity-60"
          >
            {deleteAccount.isPending ? 'Deleting Account...' : 'Delete Account'}
          </button>
        </div>
      </motion.section>
    </motion.main>
  );
}

function mapTenant(tenant: SporeTenantWire) {
  return {
    id: tenant.id,
    slug: tenant.slug,
    name: tenant.name,
    isActive: tenant.is_active,
    plan: tenant.plan,
    quotaDailyQuery: tenant.quota_daily_query,
    quotaDailyIngest: tenant.quota_daily_ingest,
    quotaDailyRelationship: tenant.quota_daily_relationship,
    quotaDailyBriefGenerate: tenant.quota_daily_brief_generate,
    metadata: tenant.metadata,
  };
}
