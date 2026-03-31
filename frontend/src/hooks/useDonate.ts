'use client';

import { useState, useCallback } from 'react';
import { parseEther } from 'viem';
import { useSendTransaction } from 'wagmi';

export type DonateChain = 'base' | 'solana';

interface DonateState {
  status: 'idle' | 'pending' | 'confirming' | 'success' | 'error';
  txHash: string | null;
  error: string | null;
}

const DONATION_ADDRESS_BASE = process.env.NEXT_PUBLIC_DONATION_ADDRESS_BASE || '';

export function useDonate() {
  const [state, setState] = useState<DonateState>({
    status: 'idle',
    txHash: null,
    error: null,
  });

  const { sendTransactionAsync } = useSendTransaction();

  const donateBase = useCallback(async (amountEth: string) => {
    if (!DONATION_ADDRESS_BASE) {
      setState({ status: 'error', txHash: null, error: 'Donation address not configured' });
      return;
    }
    setState({ status: 'pending', txHash: null, error: null });
    try {
      const hash = await sendTransactionAsync({
        to: DONATION_ADDRESS_BASE as `0x${string}`,
        value: parseEther(amountEth),
      });
      setState({ status: 'confirming', txHash: hash, error: null });
      setState({ status: 'success', txHash: hash, error: null });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Transaction failed';
      setState({ status: 'error', txHash: null, error: message });
    }
  }, [sendTransactionAsync]);

  // TODO: Phase 2 — Solana donations require @solana/web3.js and Dynamic SDK
  // wallet signing. For now, show a helpful message directing users to connect
  // a Solana wallet first.
  const donateSolana = useCallback(async (_amountSol: string) => {
    setState({
      status: 'error',
      txHash: null,
      error: 'Solana donations are coming soon. Connect a Solana wallet via the wallet button to be notified.',
    });
  }, []);

  const donate = useCallback(async (chain: DonateChain, amount: string) => {
    if (chain === 'base') {
      await donateBase(amount);
    } else {
      await donateSolana(amount);
    }
  }, [donateBase, donateSolana]);

  const reset = useCallback(() => {
    setState({ status: 'idle', txHash: null, error: null });
  }, []);

  return { ...state, donate, reset };
}
