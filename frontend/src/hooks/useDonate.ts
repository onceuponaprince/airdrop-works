'use client';

import { useState, useCallback } from 'react';
import { parseEther } from 'viem';
import { useSendTransaction } from 'wagmi';
import { Connection, PublicKey, SystemProgram, Transaction, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { getInjectedSolanaProvider } from '@/lib/solana-wallet';

export type DonateChain = 'base' | 'solana';

interface DonateState {
  status: 'idle' | 'pending' | 'confirming' | 'success' | 'error';
  txHash: string | null;
  error: string | null;
}

const DONATION_ADDRESS_BASE = process.env.NEXT_PUBLIC_DONATION_ADDRESS_BASE || '';
const DONATION_ADDRESS_SOLANA = process.env.NEXT_PUBLIC_DONATION_ADDRESS_SOLANA || '';
const SOLANA_RPC_URL =
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';

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
      const provider = getInjectedSolanaProvider();

      if (!provider) {
        throw new Error('No Solana wallet detected. Please install Phantom or Solflare.');
      }

      // Auto-connect if the wallet is not yet connected (user gesture required)
      if (!provider.isConnected) {
        try {
          await provider.connect();
        } catch {
          throw new Error('Please connect your Solana wallet (Phantom / Solflare) and try again.');
        }
      }

      const connection = new Connection(SOLANA_RPC_URL, 'confirmed');

      const publicKey = provider.publicKey || (await provider.connect()).publicKey;
      if (!publicKey) {
        throw new Error('Could not resolve Solana wallet public key. Please reconnect your wallet and try again.');
      }
      const fromPubkey = new PublicKey(publicKey.toString());
      const toPubkey = new PublicKey(DONATION_ADDRESS_SOLANA);

      const lamports = Math.floor(parseFloat(amountSol) * LAMPORTS_PER_SOL);

      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey,
          toPubkey,
          lamports,
        })
      );

      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = fromPubkey;

      const signedTx = await provider.signTransaction(transaction);
      const signature = await connection.sendRawTransaction(signedTx.serialize());

      setState({ status: 'confirming', txHash: signature, error: null });

      await connection.confirmTransaction(signature, 'confirmed');

      setState({ status: 'success', txHash: signature, error: null });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Solana transaction failed';
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
