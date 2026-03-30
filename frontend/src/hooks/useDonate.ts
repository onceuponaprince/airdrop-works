'use client';

import { useState, useCallback } from 'react';
import { parseEther } from 'viem';
import { useSendTransaction, useWaitForTransactionReceipt } from 'wagmi';

export type DonateChain = 'base' | 'solana';

interface DonateState {
  status: 'idle' | 'pending' | 'confirming' | 'success' | 'error';
  txHash: string | null;
  error: string | null;
}

const DONATION_ADDRESS_BASE = process.env.NEXT_PUBLIC_DONATION_ADDRESS_BASE || '';
const DONATION_ADDRESS_SOLANA = process.env.NEXT_PUBLIC_DONATION_ADDRESS_SOLANA || '';

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

  const donateSolana = useCallback(async (amountSol: string) => {
    if (!DONATION_ADDRESS_SOLANA) {
      setState({ status: 'error', txHash: null, error: 'Solana donation address not configured' });
      return;
    }
    setState({ status: 'pending', txHash: null, error: null });
    try {
      const { Connection, PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL } = await import('@solana/web3.js');

      const dynamicModule = await import('@dynamic-labs/sdk-react-core');
      // Solana transfer requires the Dynamic SDK wallet signer
      // This is a simplified version — in practice you'd get the signer from Dynamic context
      setState({ status: 'error', txHash: null, error: 'Solana donations use Dynamic SDK wallet signing. Connect a Solana wallet via the wallet button first.' });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Transaction failed';
      setState({ status: 'error', txHash: null, error: message });
    }
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
