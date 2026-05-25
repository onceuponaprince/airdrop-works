'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Mail, CheckCircle, Clock, Wallet, XCircle } from 'lucide-react';
import { ArcadeButton } from '@/components/themed/ArcadeButton';
import { ArcadeCard } from '@/components/themed/ArcadeCard';
import { WalletButton } from '@/components/shared/WalletButton';
import { EmailLoginSection } from '@/components/shared/EmailLoginSection';
import { SocialLoginButtons } from '@/components/shared/SocialLoginButtons';
import { useWeb3Auth } from '@/hooks/useWeb3Auth';
import { useWalletLogin } from '@/hooks/useWalletLogin';
import { checkWhitelistApproval } from '@/lib/supabase';
import { postAuthPath } from '@/lib/onboarding';
import {
  consumePostAuthDestination,
  consumePostAuthReturnPath,
} from '@/lib/postAuthRedirect';

type Step = 'email' | 'auth';

export default function SignupPage() {
  const router = useRouter();
  const { isAuthenticated, applySession, user, loading, error: authError } = useWeb3Auth();
  const { signIn, isLoggingIn, error: walletLoginError, canSignIn } = useWalletLogin();

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [checking, setChecking] = useState(false);
  const [whitelistStatus, setWhitelistStatus] = useState<{
    exists: boolean;
    approved: boolean;
    rank: number | null;
  } | null>(null);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [honeypot, setHoneypot] = useState('');

  const approvedEmail = email.trim();

  const handleCheckEmail = async () => {
    const trimmed = approvedEmail;
    if (!trimmed) return;

    setChecking(true);
    setWhitelistStatus(null);
    try {
      const result = await checkWhitelistApproval(trimmed);
      setWhitelistStatus(result);
      if (result.approved) {
        setStep('auth');
      }
    } catch {
      setWhitelistStatus({ exists: false, approved: false, rank: null });
    } finally {
      setChecking(false);
    }
  };

  const attemptWalletLogin = useCallback(async () => {
    if (!canSignIn || isLoggingIn) return;
    setLoginError(null);
    try {
      await signIn();
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : 'Authentication failed');
    }
  }, [canSignIn, isLoggingIn, signIn]);

  useEffect(() => {
    if (step === 'auth' && canSignIn && !isAuthenticated && !isLoggingIn) {
      attemptWalletLogin();
    }
  }, [step, canSignIn, isAuthenticated, isLoggingIn, attemptWalletLogin]);

  useEffect(() => {
    if (!isAuthenticated || !user || loading) return;

    const returnPath = consumePostAuthReturnPath();
    if (returnPath) {
      router.push(returnPath);
      return;
    }

    const stored = consumePostAuthDestination();
    if (stored) {
      router.push(stored);
      return;
    }

    router.push(postAuthPath(user));
  }, [isAuthenticated, user, loading, router]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && approvedEmail) {
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
              : 'Create your account with email, social, or wallet.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div
            className={`flex items-center gap-1.5 text-xs font-mono ${step === 'email' ? 'text-[--primary]' : 'text-[--muted-foreground]'}`}
          >
            <Mail size={14} />
            <span>1. Verify Email</span>
          </div>
          <div className="flex-1 h-px bg-[--border]" />
          <div
            className={`flex items-center gap-1.5 text-xs font-mono ${step === 'auth' ? 'text-[--primary]' : 'text-[--muted-foreground]'}`}
          >
            <span>2. Create Account</span>
          </div>
        </div>

        {step === 'email' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <label
                htmlFor="email"
                className="text-xs font-mono text-[--muted-foreground] uppercase tracking-widest"
              >
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

            <div
              aria-hidden="true"
              style={{
                position: 'absolute',
                left: '-9999px',
                opacity: 0,
                height: 0,
                overflow: 'hidden',
              }}
            >
              <label htmlFor="signup-website">Website</label>
              <input
                id="signup-website"
                name="website"
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
              />
            </div>

            <ArcadeButton
              onClick={handleCheckEmail}
              loading={checking}
              disabled={!approvedEmail || checking}
              className="w-full"
            >
              Verify Whitelist Status
            </ArcadeButton>

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
                      You&apos;re on the waitlist
                      {whitelistStatus.rank ? ` (#${whitelistStatus.rank})` : ''}. We&apos;ll notify
                      you when your access is approved.
                    </p>
                  </div>
                </div>
              </ArcadeCard>
            )}
          </div>
        )}

        {step === 'auth' && (
          <div className="space-y-4">
            <ArcadeCard className="border-[--primary]/30">
              <div className="flex items-start gap-3">
                <CheckCircle size={18} className="text-[--primary] shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-[--foreground]">Email approved</p>
                  <p className="text-xs text-[--muted-foreground] mt-1">
                    {approvedEmail} is whitelisted. Choose how you want to sign in.
                  </p>
                </div>
              </div>
            </ArcadeCard>

            <EmailLoginSection
              applySession={applySession}
              initialEmail={approvedEmail}
              lockEmail
            />

            <div className="relative py-1">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-[--border]" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-[--card] px-3 font-mono text-[9px] uppercase tracking-widest text-[--muted-foreground]">
                  or social
                </span>
              </div>
            </div>

            <SocialLoginButtons applySession={applySession} />

            <div className="relative py-1">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-[--border]" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-[--card] px-3 font-mono text-[9px] uppercase tracking-widest text-[--muted-foreground] flex items-center gap-1">
                  <Wallet size={10} aria-hidden />
                  or wallet
                </span>
              </div>
            </div>

            <div className="flex justify-center">
              <WalletButton />
            </div>

            {(isLoggingIn || loading) && (
              <p className="text-sm text-[--muted-foreground] animate-pulse text-center">
                Creating your account…
              </p>
            )}

            {(loginError || walletLoginError || authError) && (
              <div className="rounded border border-[--destructive] bg-[--destructive]/10 p-3 space-y-3">
                <p className="text-sm text-[--destructive]">
                  {loginError ||
                    walletLoginError ||
                    authError?.message ||
                    'Authentication failed'}
                </p>
                {canSignIn && (
                  <ArcadeButton
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={attemptWalletLogin}
                    disabled={isLoggingIn}
                  >
                    Try sign-in again
                  </ArcadeButton>
                )}
              </div>
            )}

            {canSignIn && !isAuthenticated && !isLoggingIn && (
              <ArcadeButton
                type="button"
                variant="secondary"
                className="w-full"
                onClick={attemptWalletLogin}
              >
                Sign message to continue
              </ArcadeButton>
            )}

            <button
              type="button"
              onClick={() => {
                setStep('email');
                setWhitelistStatus(null);
              }}
              className="w-full text-xs text-[--muted-foreground] hover:text-[--foreground] transition-colors"
            >
              ← Use a different email
            </button>
          </div>
        )}

        {process.env.NODE_ENV === 'development' && step === 'email' && (
          <div className="border-t border-[--border] pt-4 space-y-2">
            <p className="text-xs text-[--muted-foreground]">Dev mode: skip whitelist check</p>
            <button
              type="button"
              onClick={() => setStep('auth')}
              className="px-4 py-2 rounded border border-[--primary] text-[--primary] text-sm font-medium hover:bg-[--primary] hover:text-[--primary-foreground] transition-colors"
            >
              Skip to account setup
            </button>
          </div>
        )}

        <p className="text-xs text-[--muted-foreground] text-center pt-2">
          Already have an account?{' '}
          <Link href="/login" className="text-[--primary] hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </main>
  );
}
