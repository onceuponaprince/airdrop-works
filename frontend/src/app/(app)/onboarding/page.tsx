'use client';

import { FormEvent, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { api } from '@/lib/api';
import { staggerContainer, staggerItem } from '@/lib/animations';
import { setActiveSporeTenant } from '@/lib/sporeTenant';
import { useNotificationStore } from '@/stores/useNotificationStore';

const DEFAULT_FORM = {
  name: '',
  slug: '',
  plan: 'starter' as 'starter' | 'growth' | 'enterprise',
  scenario: 'none' as 'none' | 'twitter_pair' | 'campaign_launch',
};

export default function OnboardingPage() {
  const router = useRouter();
  const notify = useNotificationStore((s) => s.push);
  const [form, setForm] = useState(DEFAULT_FORM);

  const onboarding = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('Connect wallet and authenticate before onboarding.');
      }
      api.setToken(token);

      const created = await api.post<{
        tenant: { slug: string; name: string; plan: string };
        membership_role: string;
      }>('/spore/ops/tenants/', {
        slug: form.slug.trim(),
        name: form.name.trim(),
        plan: form.plan,
      });

      setActiveSporeTenant(created.tenant.slug);

      if (form.scenario !== 'none') {
        await api.post('/spore/ops/seed-scenario/', {
          tenant_slug: created.tenant.slug,
          scenario: form.scenario,
          content_per_account: 6,
          ambient_accounts: 4,
        });
      }

      try {
        const checkout = await api.post<{ checkout_url: string }>('/payments/create-checkout-session/', {
          tenant_slug: created.tenant.slug,
          plan: form.plan,
        });
        return { created, checkoutUrl: checkout.checkout_url };
      } catch {
        return { created, checkoutUrl: '' };
      }
    },
    onSuccess: ({ created, checkoutUrl }) => {
      notify({
        type: 'success',
        title: 'Workspace created',
        message: `Tenant ${created.tenant.slug} is ready.`,
      });
      if (checkoutUrl) {
        window.location.href = checkoutUrl;
        return;
      }
      router.push('/spore-lab');
    },
    onError: (error) => {
      notify({
        type: 'error',
        title: 'Onboarding failed',
        message: error instanceof Error ? error.message : 'Unable to complete onboarding.',
      });
    },
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onboarding.mutate();
  };

  return (
    <motion.main
      className="flex-1 space-y-8 overflow-y-auto p-6 max-w-3xl"
      initial="initial"
      animate="animate"
      variants={staggerContainer}
    >
      <motion.div variants={staggerItem}>
        <h1 className="font-display text-2xl sm:text-3xl text-[--primary]">Workspace Onboarding</h1>
        <p className="mt-2 text-sm text-[--muted-foreground]">
          Create your tenant, optionally seed a demo scenario, and continue into billing.
        </p>
      </motion.div>

      <motion.section variants={staggerItem} className="rounded-lg border border-[--border] bg-[--card] p-6">
        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="block space-y-1">
            <span className="text-xs text-[--muted-foreground]">Workspace name</span>
            <input
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              className="w-full rounded border border-[--border] bg-[--background] px-3 py-2 text-sm"
              placeholder="Acme Labs"
              required
            />
          </label>

          <label className="block space-y-1">
            <span className="text-xs text-[--muted-foreground]">Workspace slug</span>
            <input
              value={form.slug}
              onChange={(event) => setForm((prev) => ({ ...prev, slug: event.target.value.toLowerCase() }))}
              className="w-full rounded border border-[--border] bg-[--background] px-3 py-2 text-sm"
              placeholder="acme-labs"
              required
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-1">
              <span className="text-xs text-[--muted-foreground]">Plan</span>
              <select
                value={form.plan}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    plan: event.target.value as 'starter' | 'growth' | 'enterprise',
                  }))
                }
                className="w-full rounded border border-[--border] bg-[--background] px-3 py-2 text-sm"
              >
                <option value="starter">Starter</option>
                <option value="growth">Growth</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </label>

            <label className="block space-y-1">
              <span className="text-xs text-[--muted-foreground]">Optional demo seed</span>
              <select
                value={form.scenario}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    scenario: event.target.value as 'none' | 'twitter_pair' | 'campaign_launch',
                  }))
                }
                className="w-full rounded border border-[--border] bg-[--background] px-3 py-2 text-sm"
              >
                <option value="none">No demo data</option>
                <option value="twitter_pair">Twitter pair analysis</option>
                <option value="campaign_launch">Campaign launch</option>
              </select>
            </label>
          </div>

          <div className="rounded border border-[--border] bg-[--background] p-3 text-xs text-[--muted-foreground]">
            Step order: create tenant - optional seed - Stripe billing handoff - land in SPORE Lab.
          </div>

          <button
            type="submit"
            disabled={onboarding.isPending}
            className="rounded border border-[--primary] bg-[--primary] px-4 py-2 text-sm font-semibold text-[--primary-foreground] disabled:opacity-60"
          >
            {onboarding.isPending ? 'Setting up workspace...' : 'Create Workspace'}
          </button>
        </form>
      </motion.section>
    </motion.main>
  );
}
