/** @vitest-environment jsdom */

import { describe, it, expect } from 'vitest'
import { handleWalletError, getFallbackWalletConnectors } from '../walletUtils'

describe('handleWalletError', () => {
  it('maps user rejected errors to warning with retry', () => {
    const err = { message: 'User rejected the request', code: 'ACTION_REJECTED' }
    const r = handleWalletError(err, () => {})
    expect(r.type).toBe('warning')
    expect(r.message).toMatch(/rejected/i)
    expect(typeof r.retry).toBe('function')
  })

  it('maps insufficient funds to error', () => {
    const r = handleWalletError('insufficient funds')
    expect(r.type).toBe('error')
    expect(r.message.toLowerCase()).toContain('insufficient')
  })

  it('maps network/rpc errors to retryable error', () => {
    const r = handleWalletError(new Error('RPC error: timeout'), () => {})
    expect(r.type).toBe('error')
    expect(r.action).toMatch(/retry/i)
    expect(typeof r.retry).toBe('function')
  })

  it('maps wrong network to network message', () => {
    const r = handleWalletError({ message: 'Wrong chainId', code: 'NETWORK_MISMATCH' })
    expect(r.type).toBe('error')
    expect(r.message.toLowerCase()).toContain('switch')
  })

  it('maps contract failures to error', () => {
    const r = handleWalletError('execution reverted: revert')
    expect(r.type).toBe('error')
    expect(r.message.toLowerCase()).toMatch(/contract|failed|contact support/)
  })

  it('returns fallback for unknown errors', () => {
    const r = handleWalletError(undefined)
    expect(r.type).toBe('error')
    expect(r.message.length).toBeGreaterThan(0)
  })
})

describe('getFallbackWalletConnectors', () => {
  it('returns an array with expected connectors', () => {
    const connectors = getFallbackWalletConnectors()
    expect(Array.isArray(connectors)).toBe(true)
    const ids = connectors.map(c => c.id)
    expect(ids).toEqual(expect.arrayContaining(['walletconnect', 'coinbasewallet', 'metamask']))
  })
})
