'use client';

import clsx from 'clsx';
import { Check, Circle } from 'lucide-react';
import type { Branch } from '@/lib/constants';

export type OnboardingStepId = 'displayName' | 'branch' | 'wallet';

export interface OnboardingStep {
  id: OnboardingStepId;
  label: string;
  description: string;
  complete: boolean;
  optional?: boolean;
}

interface OnboardingChecklistProps {
  steps: OnboardingStep[];
  activeStep: OnboardingStepId;
  onStepSelect?: (stepId: OnboardingStepId) => void;
}

export function OnboardingChecklist({
  steps,
  activeStep,
  onStepSelect,
}: OnboardingChecklistProps) {
  return (
    <ol className="space-y-3" aria-label="Onboarding steps">
      {steps.map((step, index) => {
        const isActive = step.id === activeStep;
        const StepIcon = step.complete ? Check : Circle;

        return (
          <li key={step.id}>
            <button
              type="button"
              onClick={() => onStepSelect?.(step.id)}
              className={clsx(
                'w-full rounded-lg border px-4 py-3 text-left transition-colors',
                isActive
                  ? 'border-[--primary] bg-[--primary]/10'
                  : 'border-[--border] bg-[--card] hover:border-[--primary]/40',
              )}
              aria-current={isActive ? 'step' : undefined}
            >
              <div className="flex items-start gap-3">
                <span
                  className={clsx(
                    'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-mono',
                    step.complete
                      ? 'border-[--primary] bg-[--primary] text-[--primary-foreground]'
                      : 'border-[--border] text-[--muted-foreground]',
                  )}
                >
                  <StepIcon size={14} aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2 text-sm font-medium text-[--foreground]">
                    <span className="font-mono text-[10px] text-[--muted-foreground]">
                      {index + 1}
                    </span>
                    {step.label}
                    {step.optional ? (
                      <span className="rounded bg-[--secondary] px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-[--muted-foreground]">
                        Optional
                      </span>
                    ) : null}
                  </span>
                  <span className="mt-1 block text-xs text-[--muted-foreground]">
                    {step.description}
                  </span>
                </span>
              </div>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

export function buildOnboardingSteps(input: {
  displayName: string;
  branch: Branch | '';
  walletConnected: boolean;
}): OnboardingStep[] {
  return [
    {
      id: 'displayName',
      label: 'Choose a display name',
      description: 'How other players see you on leaderboards and quests.',
      complete: input.displayName.trim().length >= 2,
    },
    {
      id: 'branch',
      label: 'Pick your branch',
      description: 'Your starting path in the skill tree — you can grow every branch later.',
      complete: Boolean(input.branch),
    },
    {
      id: 'wallet',
      label: 'Connect a wallet',
      description: 'Optional now. Needed later for on-chain rewards and loot claims.',
      complete: input.walletConnected,
      optional: true,
    },
  ];
}
