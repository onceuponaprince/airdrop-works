'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Mail, CheckCircle, Clock, XCircle } from 'lucide-react';
import { Turnstile } from '@marsidev/react-turnstile';
import { ArcadeButton } from '@/components/themed/ArcadeButton';
import { ArcadeCard } from '@/components/themed/ArcadeCard';
import { WalletButton } from '@/components/shared/WalletButton';
import { useWeb3Auth } from '@/hooks/useWeb3Auth';
import { useOptionalDynamicContext } from '@/hooks/useOptionalDynamicContext';
import { checkWhitelistApproval } from '@/lib/supabase';

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? '';

type Step = 'email' | 'wallet';

export default function SignupPage() {
  const router = useRouter();
  const { isAuthenticated, login } = useWeb3Auth();
  const dynamicContext = useOptionalDynamicContext();
  const primaryWallet = dynamicContext.primaryWallet;

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [checking, setChecking] = useState(false);
  const [whitelistStatus, setWhitelistStatus] = useState<{
    exists: boolean;
    approved: boolean;
    rank: number | null;
  } | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const captchaPending = TURNSTILE_SITE_KEY.length > 0 && !turnstileToken;

  // Check whitelist status for the entered email
  const handleCheckEmail = async () => {
    const trimmed = email.trim();
    if (!trimmed) return;

    setChecking(true);
    setWhitelistStatus(null);
    try {
      const result = await checkWhitelistApproval(trimmed);
      setWhitelistStatus(result);
      if (result.approved) {
        setStep('wallet');
      }
    } catch {
      setWhitelistStatus({ exists: false, approved: false, rank: null });
    } finally {
      setChecking(false);
    }
  };

  // Auto-login when wallet connects on the wallet step
  const attemptLogin = useCallback(async () => {
    if (!primaryWallet?.address || isLoggingIn) return;
    setIsLoggingIn(true);
    setLoginError(null);
    try {
      await login(primaryWallet.address, 'dynamic-sdk-managed', 'dynamic-sdk-managed');
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setIsLoggingIn(false);
    }
  }, [primaryWallet?.address, login, isLoggingIn]);

  useEffect(() => {
    if (step === 'wallet' && primaryWallet?.address && !isAuthenticated && !isLoggingIn) {
      attemptLogin();
    }
  }, [step, primaryWallet?.address, isAuthenticated, isLoggingIn, attemptLogin]);

  // Redirect to judge after successful auth
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/judge');
    }
  }, [isAuthenticated, router]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && email.trim()) {
      handleCheckEmail();
    }
  };

  return (
    <main className="min-h-screen bg-[--background] text-[--foreground] px-4 py-24">
      <div className="max-w-md mx-auto rounded-lg border border-[--border] bg-[--card] p-6 space-y-6 relative">
        <Link
          href="/pricing"
          className="absolute top-4 right-4 p-2 rounded hover:bg-[--secondary] text-[--muted-foreground] hover:text-[--foreground] transition-colors"
          aria-label="Back to pricing"
        >
          <ArrowLeft size={18} />
        </Link>

        <div className="space-y-2">
          <h1 className="font-display text-2xl text-[--primary]">Sign Up</h1>
          <p className="text-sm text-[--muted-foreground]">
            {step === 'email'
              ? 'Enter the email you used to join the waitlist.'
              : 'Connect your wallet to create your account.'}
          </p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1.5 text-xs font-mono ${step === 'email' ? 'text-[--primary]' : 'text-[--muted-foreground]'}`}>
            <Mail size={14} />
            <span>1. Verify Email</span>
          </div>
          <div className="flex-1 h-px bg-[--border]" />
          <div className={`flex items-center gap-1.5 text-xs font-mono ${step === 'wallet' ? 'text-[--primary]' : 'text-[--muted-foreground]'}`}>
            <span>2. Connect Wallet</span>
          </div>
        </div>

        {/* Step 1: Email check */}
        {step === 'email' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-xs font-mono text-[--muted-foreground] uppercase tracking-widest">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="you@example.com"
                className="w-full px-4 py-2.5 rounded-lg border border-[--border] bg-transparent text-sm text-[--foreground] placeholder:text-[--muted-foreground]/40 focus:outline-none focus:ring-2 focus:ring-[--ring] font-body"
              />
            </div>

            {/* CAPTCHA — Cloudflare Turnstile */}
            {TURNSTILE_SITE_KEY && (
              <div className="flex justify-center">
                <Turnstile
                  siteKey={TURNSTILE_SITE_KEY}
                  onSuccess={setTurnstileToken}
                  onExpire={() => setTurnstileToken(null)}
                  options={{ theme: 'dark', size: 'flexible' }}
                />
              </div>
            )}

            <ArcadeButton
              onClick={handleCheckEmail}
              loading={checking}
              disabled={!email.trim() || checking || captchaPending}
              className="w-full"
            >
              Verify Whitelist Status
            </ArcadeButton>

            {/* Result messages */}
            {whitelistStatus && !whitelistStatus.exists && (
              <ArcadeCard className="border-[--destructive]/50">
                <div className="flex items-start gap-3">
                  <XCircle size={18} className="text-[--destructive] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-[--foreground]">Not on the waitlist</p>
                    <p className="text-xs text-[--muted-foreground] mt-1">
                      You need to join the waitlist first.{' '}
                      <Link href="/#waitlist" className="text-[--primary] underline">
                        Join now
                      </Link>
                    </p>
                  </div>
                </div>
              </ArcadeCard>
            )}

            {whitelistStatus && whitelistStatus.exists && !whitelistStatus.approved && (
              <ArcadeCard className="border-[--accent]/50">
                <div className="flex items-start gap-3">
                  <Clock size={18} className="text-[--accent] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-[--foreground]">Pending approval</p>
                    <p className="text-xs text-[--muted-foreground] mt-1">
                      You&apos;re on the waitlist{whitelistStatus.rank ? ` (#${whitelistStatus.rank})` : ''}.
                      We&apos;ll notify you when your access is approved.
                    </p>
                  </div>
                </div>
              </ArcadeCard>
            )}
          </div>
        )}

        {/* Step 2: Wallet connect */}
        {step === 'wallet' && (
          <div className="space-y-4">
            <ArcadeCard className="border-[--primary]/30">
              <div className="flex items-start gap-3">
                <CheckCircle size={18} className="text-[--primary] shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-[--foreground]">Email approved</p>
                  <p className="text-xs text-[--muted-foreground] mt-1">
                    {email} is whitelisted. Connect your wallet to create your account.
                  </p>
                </div>
              </div>
            </ArcadeCard>

            <div className="flex justify-center">
              <WalletButton />
            </div>

            {(isLoggingIn) && (
              <p className="text-sm text-[--muted-foreground] animate-pulse text-center">
                Creating your account...
              </p>
            )}

            {loginError && (
              <div className="rounded border border-[--destructive] bg-[--destructive]/10 p-3">
                <p className="text-sm text-[--destructive]">{loginError}</p>
              </div>
            )}

            <button
              onClick={() => { setStep('email'); setWhitelistStatus(null); }}
              className="w-full text-xs text-[--muted-foreground] hover:text-[--foreground] transition-colors"
            >
              ← Use a different email
            </button>
          </div>
        )}

        {/* Dev bypass */}
        {process.env.NODE_ENV === 'development' && step === 'email' && (
          <div className="border-t border-[--border] pt-4 space-y-2">
            <p className="text-xs text-[--muted-foreground]">
              Dev mode: skip whitelist check
            </p>
            <button
              onClick={() => setStep('wallet')}
              className="px-4 py-2 rounded border border-[--primary] text-[--primary] text-sm font-medium hover:bg-[--primary] hover:text-[--primary-foreground] transition-colors"
            >
              Skip to Wallet Connect
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
