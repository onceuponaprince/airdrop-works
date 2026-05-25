'use client';

import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import { api } from '@/lib/api';
import { BRANCHES, type Branch } from '@/lib/constants';
import { staggerContainer, staggerItem } from '@/lib/animations';
import { needsOnboarding, type AuthUser } from '@/lib/onboarding';
import {
  OnboardingChecklist,
  buildOnboardingSteps,
  type OnboardingStepId,
} from '@/components/app/OnboardingChecklist';
import { BranchIcon } from '@/components/themed/BranchIcon';
import { WalletButton } from '@/components/shared/WalletButton';
import { ArcadeButton } from '@/components/themed/ArcadeButton';
import { useParticleWallet } from '@/hooks/useParticleWallet';
import { useNotificationStore } from '@/stores/useNotificationStore';

export default function OnboardingPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const notify = useNotificationStore((s) => s.push);
  const wallet = useParticleWallet();

  const { data: user, isLoading } = useQuery({
    queryKey: ['auth', 'profile'],
    queryFn: () => api.get<AuthUser>('/auth/me/'),
  });

  const [activeStep, setActiveStep] = useState<OnboardingStepId>('displayName');
  const [displayName, setDisplayName] = useState('');
  const [branch, setBranch] = useState<Branch | ''>('');

  useEffect(() => {
    if (!user) return;
    setDisplayName(user.displayName ?? '');
    setBranch((user.preferredBranch as Branch | '') ?? '');
  }, [user]);

  useEffect(() => {
    if (isLoading || !user) return;
    if (!needsOnboarding(user)) {
      router.replace('/dashboard');
    }
  }, [isLoading, user, router]);

  const steps = useMemo(
    () =>
      buildOnboardingSteps({
        displayName,
        branch,
        walletConnected: Boolean(wallet.isConnected && wallet.address),
      }),
    [displayName, branch, wallet.address, wallet.isConnected],
  );

  const saveProfile = useMutation({
    mutationFn: async (payload: {
      display_name?: string;
      preferred_branch?: Branch | '';
      onboarding_completed?: boolean;
    }) => api.patch<AuthUser>('/auth/me/', payload),
    onSuccess: (updated) => {
      queryClient.setQueryData(['auth', 'profile'], updated);
    },
    onError: (error) => {
      notify({
        type: 'error',
        title: 'Could not save profile',
        message: error instanceof Error ? error.message : 'Try again in a moment.',
      });
    },
  });

  const finishOnboarding = async (skipped = false) => {
    if (!branch && !skipped) {
      notify({
        type: 'warning',
        title: 'Pick a branch',
        message: 'Choose a branch to continue, or use Skip for now.',
      });
      setActiveStep('branch');
      return;
    }

    await saveProfile.mutateAsync({
      display_name: displayName.trim() || undefined,
      preferred_branch: branch || undefined,
      onboarding_completed: true,
    });

    notify({
      type: 'success',
      title: skipped ? 'Onboarding skipped' : 'Welcome aboard',
      message: skipped
        ? 'You can finish setup anytime from Settings.'
        : 'Your profile is ready — time to quest.',
    });
    router.push('/dashboard');
  };

  if (isLoading || !user) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[--primary] border-t-transparent" />
      </div>
    );
  }

  return (
    <motion.main
      className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-8 overflow-y-auto p-6"
      initial="initial"
      animate="animate"
      variants={staggerContainer}
    >
      <motion.div variants={staggerItem} className="space-y-2">
        <h1 className="font-display text-2xl text-[--primary] sm:text-3xl">Set up your character</h1>
        <p className="text-sm text-[--muted-foreground]">
          You signed in without a wallet. Add a display name and branch to personalize your dashboard.
          Wallet connect is optional for now.
        </p>
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,280px)_1fr]">
        <motion.section variants={staggerItem}>
          <OnboardingChecklist
            steps={steps}
            activeStep={activeStep}
            onStepSelect={setActiveStep}
          />
        </motion.section>

        <motion.section
          variants={staggerItem}
          className="rounded-lg border border-[--border] bg-[--card] p-6"
        >
          {activeStep === 'displayName' ? (
            <div className="space-y-4">
              <div>
                <h2 className="font-heading text-lg font-semibold">Display name</h2>
                <p className="mt-1 text-sm text-[--muted-foreground]">
                  Shown on leaderboards, quests, and your public profile.
                </p>
              </div>
              <label className="block space-y-1">
                <span className="text-xs text-[--muted-foreground]">Name</span>
                <input
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  className="w-full rounded border border-[--border] bg-[--background] px-3 py-2 text-sm"
                  placeholder="Nova Builder"
                  maxLength={64}
                  autoFocus
                />
              </label>
              <ArcadeButton type="button" onClick={() => setActiveStep('branch')}>
                Continue
              </ArcadeButton>
            </div>
          ) : null}

          {activeStep === 'branch' ? (
            <div className="space-y-4">
              <div>
                <h2 className="font-heading text-lg font-semibold">Choose your branch</h2>
                <p className="mt-1 text-sm text-[--muted-foreground]">
                  This sets your starting focus. You can earn XP in every branch over time.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {(Object.keys(BRANCHES) as Branch[]).map((branchKey) => {
                  const meta = BRANCHES[branchKey];
                  const selected = branch === branchKey;
                  return (
                    <button
                      key={branchKey}
                      type="button"
                      onClick={() => setBranch(branchKey)}
                      className={clsx(
                        'rounded-lg border p-4 text-left transition-colors',
                        selected
                          ? 'border-[--primary] bg-[--primary]/10'
                          : 'border-[--border] bg-[--background] hover:border-[--primary]/40',
                      )}
                      aria-pressed={selected}
                    >
                      <BranchIcon branch={branchKey} showLabel size={18} />
                      <p className="mt-2 text-xs text-[--muted-foreground]">{meta.description}</p>
                    </button>
                  );
                })}
              </div>
              <ArcadeButton type="button" onClick={() => setActiveStep('wallet')}>
                Continue
              </ArcadeButton>
            </div>
          ) : null}

          {activeStep === 'wallet' ? (
            <div className="space-y-4">
              <div>
                <h2 className="font-heading text-lg font-semibold">Connect a wallet (optional)</h2>
                <p className="mt-1 text-sm text-[--muted-foreground]">
                  Link a wallet when you are ready for on-chain rewards. You can skip and add one later
                  from Settings.
                </p>
              </div>
              <WalletButton />
              <p className="text-xs text-[--muted-foreground]">
                Connecting a wallet after onboarding will sign you in with your wallet identity on next
                login.
              </p>
            </div>
          ) : null}

          <div className="mt-8 flex flex-wrap gap-3 border-t border-[--border] pt-6">
            <ArcadeButton
              type="button"
              loading={saveProfile.isPending}
              onClick={() => finishOnboarding(false)}
            >
              Finish setup
            </ArcadeButton>
            <ArcadeButton
              type="button"
              variant="ghost"
              loading={saveProfile.isPending}
              onClick={() => finishOnboarding(true)}
            >
              Skip for now
            </ArcadeButton>
          </div>
        </motion.section>
      </div>
    </motion.main>
  );
}
