'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { WalletButton } from '@/components/shared/WalletButton';
import { EmailLoginSection } from '@/components/shared/EmailLoginSection';
import { SocialLoginButtons } from '@/components/shared/SocialLoginButtons';
import { useWeb3Auth } from '@/hooks/useWeb3Auth';
import { useParticleWallet } from '@/hooks/useParticleWallet';
import { useWalletLogin } from '@/hooks/useWalletLogin';
import { postAuthPath } from '@/lib/onboarding';

export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated, loading, error: authError, applySession, login, user } = useWeb3Auth();
  const wallet = useParticleWallet();
  const { signIn, isLoggingIn, error: walletLoginError, canSignIn } = useWalletLogin();
  const [loginError, setLoginError] = useState<string | null>(null);
  const [devLoggingIn, setDevLoggingIn] = useState(false);

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

  // Redirect after profile loads so social-only users land on /onboarding.
  useEffect(() => {
    if (isAuthenticated && user && !loading) {
      router.push(postAuthPath(user));
    }
  }, [isAuthenticated, user, loading, router]);

  // Dev bypass: allow login without wallet in development
  const handleDevLogin = async () => {
    setDevLoggingIn(true);
    setLoginError(null);
    try {
      await login('0x0000000000000000000000000000000000000000', 'dev-bypass', 'dev-bypass');
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : 'Dev login failed');
    } finally {
      setDevLoggingIn(false);
    }
  };

  return (
    <main className="min-h-screen bg-[--background] text-[--foreground] px-4 py-24">
      <div className="max-w-md mx-auto rounded-lg border border-[--border] bg-[--card] p-6 space-y-6 relative">
        <Link
          href="/"
          className="absolute top-4 right-4 p-2 rounded hover:bg-[--secondary] text-[--muted-foreground] hover:text-[--foreground] transition-colors"
          aria-label="Back to home"
        >
          <ArrowLeft size={18} />
        </Link>
        <div className="space-y-2">
          <h1 className="font-display text-2xl text-[--primary]">Login</h1>
          <p className="text-sm text-[--muted-foreground]">
            Sign in with email or connect your wallet to access the app.
          </p>
        </div>

        <EmailLoginSection applySession={applySession} />

        <SocialLoginButtons applySession={applySession} />

        <div className="relative py-2">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-[--border]" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-[--card] px-2 text-[--muted-foreground]">or wallet</span>
          </div>
        </div>

        <div className="flex justify-start">
          <WalletButton />
        </div>

        {(isLoggingIn || loading) && (
          <p className="text-sm text-[--muted-foreground] animate-pulse">
            Authenticating with backend...
          </p>
        )}

        {(loginError || walletLoginError || authError) && (
          <div className="rounded border border-[--destructive] bg-[--destructive]/10 p-3 space-y-3">
            <p className="text-sm text-[--destructive]">
              {loginError || walletLoginError || authError?.message || 'Authentication failed'}
            </p>
            <div className="flex flex-wrap gap-2">
              {canSignIn && (
                <button
                  type="button"
                  onClick={attemptLogin}
                  disabled={isLoggingIn}
                  className="px-3 py-1.5 rounded border border-[--primary] text-[--primary] text-xs font-semibold hover:bg-[--primary]/10 disabled:opacity-60"
                >
                  Try sign-in again
                </button>
              )}
              {wallet.available && (
                <button
                  type="button"
                  onClick={() => wallet.retryConnect?.() ?? wallet.openConnectModal()}
                  className="px-3 py-1.5 rounded border border-[--border] text-xs font-semibold hover:bg-[--secondary]"
                >
                  Reconnect wallet
                </button>
              )}
            </div>
          </div>
        )}

        {canSignIn && !isAuthenticated && !isLoggingIn && (
          <button
            type="button"
            onClick={attemptLogin}
            className="w-full px-4 py-2 rounded border border-[--primary] text-[--primary] text-sm font-medium hover:bg-[--primary]/10 transition-colors"
          >
            Sign message to continue
          </button>
        )}

        {process.env.NODE_ENV === 'development' && !wallet.available && (
          <div className="border-t border-[--border] pt-4 space-y-2">
            <p className="text-xs text-[--muted-foreground]">
              Particle wallet not configured. Use dev login to bypass wallet auth:
            </p>
            <button
              onClick={handleDevLogin}
              disabled={devLoggingIn || isLoggingIn}
              className="px-4 py-2 rounded border border-[--primary] text-[--primary] text-sm font-medium hover:bg-[--primary] hover:text-[--primary-foreground] transition-colors disabled:opacity-50"
            >
              {devLoggingIn ? 'Logging in...' : 'Dev Login (no wallet)'}
            </button>
          </div>
        )}

        <div className="text-xs text-[--muted-foreground] border-t border-[--border] pt-4 space-y-2">
          <p>
            By signing in, you agree to our Terms of Service.
          </p>
          <p>
            On the waitlist and approved?{' '}
            <Link href="/signup" className="text-[--primary] hover:underline">
              Enter via signup
            </Link>
            {' · '}
            <Link href="/" className="text-[--primary] hover:underline">
              Back to home
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
