'use client';

import { Suspense, useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Wallet } from 'lucide-react';
import { WalletButton } from '@/components/shared/WalletButton';
import { EmailLoginSection } from '@/components/shared/EmailLoginSection';
import { SocialLoginButtons } from '@/components/shared/SocialLoginButtons';
import { ArcadeButton } from '@/components/themed/ArcadeButton';
import { ArcadeCard } from '@/components/themed/ArcadeCard';
import { CrtOverlay } from '@/components/themed/CrtOverlay';
import { useWeb3Auth } from '@/hooks/useWeb3Auth';
import { useParticleWallet } from '@/hooks/useParticleWallet';
import { useWalletLogin } from '@/hooks/useWalletLogin';
import { postAuthPath } from '@/lib/onboarding';
import {
  consumePostAuthDestination,
  consumePostAuthReturnPath,
  isSafeReturnPath,
  setPostAuthReturnPath,
  setPostAuthDestination,
} from '@/lib/postAuthRedirect';
import {
  consumeMergeConfirmedCallback,
  mergeErrorMessage,
  parseLoginMergeParams,
} from '@/lib/loginMergeParams';
import { ACCOUNT_SCORE_LOGIN_MESSAGE_KEY } from '@/lib/canShowAccountScore';

const LOGIN_MESSAGES: Record<string, string> = {
  [ACCOUNT_SCORE_LOGIN_MESSAGE_KEY]:
    'Sign in to see your full account score results.',
};

function LoginPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, loading, error: authError, applySession, login, user } = useWeb3Auth();
  const wallet = useParticleWallet();
  const { signIn, isLoggingIn, error: walletLoginError, canSignIn } = useWalletLogin();
  const [loginError, setLoginError] = useState<string | null>(null);
  const [devLoggingIn, setDevLoggingIn] = useState(false);
  const [mergePendingBanner, setMergePendingBanner] = useState(false);
  const [mergePendingEmail, setMergePendingEmail] = useState<string | null>(null);
  const [mergeError, setMergeError] = useState<string | null>(null);

  const loginHint =
    LOGIN_MESSAGES[searchParams.get('message') ?? ''] ?? null;

  useEffect(() => {
    if (consumeMergeConfirmedCallback(applySession)) {
      return;
    }

    const mergeParams = parseLoginMergeParams(searchParams);
    if (!mergeParams) return;

    if (mergeParams.status === 'pending') {
      setMergePendingBanner(true);
      setMergePendingEmail(mergeParams.email ?? null);
      setMergeError(null);
    } else if (mergeParams.status === 'error') {
      setMergeError(mergeErrorMessage(mergeParams.reason));
      setMergePendingBanner(false);
      setMergePendingEmail(null);
    }

    router.replace('/login');
  }, [searchParams, applySession, router]);

  useEffect(() => {
    const next = searchParams.get('next');
    if (next && isSafeReturnPath(next)) {
      setPostAuthReturnPath(next);
    }
  }, [searchParams]);

  const attemptLogin = useCallback(async () => {
    if (!canSignIn || isLoggingIn) return;
    setLoginError(null);
    try {
      await signIn();
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : 'Authentication failed');
    }
  }, [canSignIn, isLoggingIn, signIn]);

  useEffect(() => {
    if (canSignIn && !isAuthenticated && !isLoggingIn) {
      attemptLogin();
    }
  }, [canSignIn, isAuthenticated, isLoggingIn, attemptLogin]);

  // Post-auth: session override (S5) then profile-aware path (S7).
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

  const handleDevLogin = async () => {
    setDevLoggingIn(true);
    setLoginError(null);
    try {
      setPostAuthDestination('/dashboard');
      await login('0x0000000000000000000000000000000000000000', 'dev-bypass', 'dev-bypass');
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : 'Dev login failed');
    } finally {
      setDevLoggingIn(false);
    }
  };

  return (
    <main className="relative min-h-screen bg-background text-foreground px-4 py-24 overflow-hidden">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'var(--gradient-hero)' }}
      />
      <CrtOverlay className="absolute inset-0 pointer-events-none opacity-40" />

      <div className="relative z-10 max-w-md mx-auto">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 mb-4 font-mono text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={14} />
          Back to home
        </Link>

        <ArcadeCard glow className="space-y-6 relative">
          <div className="space-y-2 text-center sm:text-left">
            <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
              Player login
            </p>
            <h1 className="font-display text-2xl text-primary glow-green">Log in</h1>
            <p className="text-sm text-muted-foreground font-body">
              Email, social, or wallet — pick your path into the app.
            </p>
            {loginHint && (
              <p className="text-sm text-primary/90 font-body border border-primary/25 bg-primary/5 rounded-[var(--radius)] px-3 py-2">
                {loginHint}
              </p>
            )}
            {mergePendingBanner && (
              <div
                className="text-sm text-primary/90 font-body border border-primary/25 bg-primary/5 rounded-[var(--radius)] px-3 py-2 space-y-1"
                role="status"
              >
                <p className="font-medium">Check your email to link accounts</p>
                <p className="text-xs text-muted-foreground">
                  We sent a confirmation link
                  {mergePendingEmail ? (
                    <>
                      {' '}
                      to <span className="text-foreground">{mergePendingEmail}</span>
                    </>
                  ) : null}
                  . Open it to finish linking your identities.
                </p>
              </div>
            )}
            {mergeError && (
              <p className="text-sm text-destructive font-body border border-destructive/30 bg-destructive/10 rounded-[var(--radius)] px-3 py-2">
                {mergeError}
              </p>
            )}
          </div>

          <EmailLoginSection applySession={applySession} />

          <div className="relative py-1">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-card px-3 font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
                or social
              </span>
            </div>
          </div>

          <SocialLoginButtons applySession={applySession} />

          <div className="relative py-1">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-card px-3 font-mono text-[9px] uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                <Wallet size={10} aria-hidden />
                or wallet
              </span>
            </div>
          </div>

          <div className="flex justify-center sm:justify-start">
            <WalletButton />
          </div>

          {(isLoggingIn || loading) && (
            <p className="text-sm text-muted-foreground animate-pulse text-center font-mono text-xs">
              Authenticating with backend…
            </p>
          )}

          {(loginError || walletLoginError || authError) && (
            <div className="rounded-sm border border-destructive/50 bg-destructive/10 p-3 space-y-3">
              <p className="text-sm text-destructive">
                {loginError || walletLoginError || authError?.message || 'Authentication failed'}
              </p>
              <div className="flex flex-wrap gap-2">
                {canSignIn && (
                  <ArcadeButton
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={attemptLogin}
                    disabled={isLoggingIn}
                  >
                    Try sign-in again
                  </ArcadeButton>
                )}
                {wallet.available && (
                  <ArcadeButton
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => wallet.retryConnect?.() ?? wallet.openConnectModal()}
                  >
                    Reconnect wallet
                  </ArcadeButton>
                )}
              </div>
            </div>
          )}

          {canSignIn && !isAuthenticated && !isLoggingIn && (
            <ArcadeButton
              type="button"
              variant="secondary"
              className="w-full"
              onClick={attemptLogin}
            >
              Sign message to continue
            </ArcadeButton>
          )}

          {process.env.NODE_ENV === 'development' && !wallet.available && (
            <div className="border-t border-border pt-4 space-y-2">
              <p className="text-xs text-muted-foreground font-mono">
                Particle wallet not configured — dev bypass:
              </p>
              <ArcadeButton
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleDevLogin}
                loading={devLoggingIn || isLoggingIn}
                disabled={devLoggingIn || isLoggingIn}
              >
                Dev login (no wallet)
              </ArcadeButton>
            </div>
          )}

          <div className="text-xs text-muted-foreground border-t border-border pt-4 space-y-2 font-body">
            <p>By signing in, you agree to our Terms of Service.</p>
            <p>
              On the waitlist and approved?{' '}
              <Link href="/signup" className="text-primary hover:underline">
                Enter via signup
              </Link>
            </p>
          </div>
        </ArcadeCard>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageInner />
    </Suspense>
  );
}
