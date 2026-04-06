'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { WalletButton } from '@/components/shared/WalletButton';
import { useWeb3Auth } from '@/hooks/useWeb3Auth';
import { useParticleWallet } from '@/hooks/useParticleWallet';

export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated, loading, error: authError } = useWeb3Auth();
  const { login } = useWeb3Auth();
  const wallet = useParticleWallet();
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const attemptLogin = useCallback(async () => {
    if (!wallet.address || isLoggingIn) return;

    setIsLoggingIn(true);
    setLoginError(null);
    try {
      await login(wallet.address, 'particle-managed', 'particle-managed');
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setIsLoggingIn(false);
    }
  }, [wallet.address, login, isLoggingIn]);

  useEffect(() => {
    if (wallet.address && !isAuthenticated && !isLoggingIn) {
      attemptLogin();
    }
  }, [wallet.address, isAuthenticated, isLoggingIn, attemptLogin]);

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/judge');
    }
  }, [isAuthenticated, router]);

  // Dev bypass: allow login without wallet in development
  const handleDevLogin = async () => {
    setIsLoggingIn(true);
    setLoginError(null);
    try {
      await login('0x0000000000000000000000000000000000000000', 'dev-bypass', 'dev-bypass');
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : 'Dev login failed');
    } finally {
      setIsLoggingIn(false);
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
            Connect your wallet to authenticate and access the app dashboard.
          </p>
        </div>

        <div className="flex justify-start">
          <WalletButton />
        </div>

        {(isLoggingIn || loading) && (
          <p className="text-sm text-[--muted-foreground] animate-pulse">
            Authenticating with backend...
          </p>
        )}

        {(loginError || authError) && (
          <div className="rounded border border-[--destructive] bg-[--destructive]/10 p-3">
            <p className="text-sm text-[--destructive]">
              {loginError || authError?.message || 'Authentication failed'}
            </p>
          </div>
        )}

        {process.env.NODE_ENV === 'development' && !wallet.available && (
          <div className="border-t border-[--border] pt-4 space-y-2">
            <p className="text-xs text-[--muted-foreground]">
              Particle wallet not configured. Use dev login to bypass wallet auth:
            </p>
            <button
              onClick={handleDevLogin}
              disabled={isLoggingIn}
              className="px-4 py-2 rounded border border-[--primary] text-[--primary] text-sm font-medium hover:bg-[--primary] hover:text-[--primary-foreground] transition-colors disabled:opacity-50"
            >
              {isLoggingIn ? 'Logging in...' : 'Dev Login (no wallet)'}
            </button>
          </div>
        )}

        <div className="text-xs text-[--muted-foreground] border-t border-[--border] pt-4">
          By connecting, you agree to our Terms of Service. Your wallet address
          is your identity — no email required.
        </div>
      </div>
    </main>
  );
}
