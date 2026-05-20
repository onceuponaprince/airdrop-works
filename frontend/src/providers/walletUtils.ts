/**
 * Pure helpers for wallet error mapping and fallback connectors.
 * Kept separate so unit tests can import these without pulling ConnectKit.
 */
export function handleWalletError(
  error: unknown,
  retryCallback?: () => void
): {
  type: 'error' | 'warning'
  message: string
  action?: string
  retry?: () => void
} {
  const walletError = typeof error === 'object' && error !== null
    ? (error as { message?: string; code?: string | number })
    : null
  const errorMessage = typeof error === 'string'
    ? error
    : walletError?.message || String(error)
  const normalizedErrorMessage = (error === null || error === undefined || errorMessage === 'null' || errorMessage === 'undefined')
    ? ''
    : errorMessage
  const errorCode = walletError?.code || ''
  const normalizedMessage = (errorMessage || '').toLowerCase()

  if (
    errorCode === 'ACTION_REJECTED' ||
    normalizedMessage.includes('user rejected') ||
    normalizedMessage.includes('user denied') ||
    normalizedMessage.includes('rejected')
  ) {
    return {
      type: 'warning',
      message: 'You rejected the wallet action. Try again when ready.',
      action: 'Try again',
      retry: retryCallback,
    }
  }

  if (
    normalizedMessage.includes('insufficient funds') ||
    normalizedMessage.includes('insufficient balance') ||
    normalizedMessage.includes('insufficient gas')
  ) {
    return {
      type: 'error',
      message: 'Insufficient funds or gas. Please check your wallet balance.',
      action: 'Dismiss',
    }
  }

  if (
    errorCode === 'SERVER_ERROR' ||
    normalizedMessage.includes('network error') ||
    normalizedMessage.includes('rpc error') ||
    normalizedMessage.includes('eth_call') ||
    normalizedMessage.includes('timeout')
  ) {
    return {
      type: 'error',
      message: 'Network issue. Please check your connection and try again.',
      action: 'Retry',
      retry: retryCallback,
    }
  }

  if (
    errorCode === 'NETWORK_MISMATCH' ||
    normalizedMessage.includes('wrong chain') ||
    normalizedMessage.includes('chainid')
  ) {
    return {
      type: 'error',
      message: 'Please switch to Avalanche or Base network in your wallet.',
      action: 'Dismiss',
    }
  }

  if (
    normalizedMessage.includes('contract') ||
    normalizedMessage.includes('execution reverted')
  ) {
    return {
      type: 'error',
      message: 'Contract interaction failed. Please try again or contact support.',
      action: 'Dismiss',
    }
  }

  if (
    normalizedMessage.includes('not connected') ||
    normalizedMessage.includes('no account') ||
    normalizedMessage.includes('wallet disconnected')
  ) {
    return {
      type: 'warning',
      message: 'Wallet not connected. Please connect your wallet.',
      action: 'Connect',
    }
  }

  return {
    type: 'error',
    message: normalizedErrorMessage || 'An unexpected wallet error occurred. Please try again.',
    action: 'Dismiss',
    retry: retryCallback,
  }
}

export function getFallbackWalletConnectors() {
  return [
    {
      id: 'walletconnect',
      name: 'WalletConnect',
      description: 'Connect via WalletConnect (supports 300+ wallets)',
      logo: '🔗',
      priority: 1,
      chains: ['avalanche', 'base'],
    },
    {
      id: 'coinbasewallet',
      name: 'Coinbase Wallet',
      description: 'Connect with Coinbase Wallet',
      logo: '₿',
      priority: 2,
      chains: ['avalanche', 'base'],
    },
    {
      id: 'metamask',
      name: 'MetaMask',
      description: 'Connect with MetaMask browser extension',
      logo: '🦊',
      priority: 3,
      chains: ['avalanche', 'base'],
    },
  ]
}

export default {
  handleWalletError,
  getFallbackWalletConnectors,
}
