/**
 * Returns a string of JS that installs a minimal `window.ethereum` mock
 * usable for Playwright's `page.addInitScript({ content })`.
 *
 * The mock supports `request({ method, params })` and emits basic events.
 */

export function providerScriptSuccess({ address = '0x' + 'a'.repeat(40), chainId = '0x1' } = {}) {
  return `(() => {
    const provider = {
      isMetaMask: true,
      selectedAddress: '${address}',
      chainId: '${chainId}',
      request: async ({ method, params }) => {
        if (method === 'eth_requestAccounts') return ['${address}']
        if (method === 'eth_chainId') return '${chainId}'
        if (method === 'eth_accounts') return ['${address}']
        return null
      },
      on: (evt, cb) => { window.__ethereum_listeners = window.__ethereum_listeners || []; window.__ethereum_listeners.push({evt, cb}) },
      removeListener: (evt, cb) => {},
    }
    Object.defineProperty(window, 'ethereum', { value: provider, writable: false })
  })()`
}

export function providerScriptReject() {
  return `(() => {
    const provider = {
      isMetaMask: true,
      request: async ({ method }) => {
        if (method === 'eth_requestAccounts') throw new Error('User rejected the request')
        return null
      },
      on: () => {},
      removeListener: () => {},
    }
    Object.defineProperty(window, 'ethereum', { value: provider, writable: false })
  })()`
}

export function providerScriptWrongNetwork({ address = '0x' + 'b'.repeat(40), chainId = '0x89' } = {}) {
  return `(() => {
    const provider = {
      isMetaMask: true,
      selectedAddress: '${address}',
      chainId: '${chainId}',
      request: async ({ method }) => {
        if (method === 'eth_requestAccounts') return ['${address}']
        if (method === 'eth_chainId') return '${chainId}'
        return null
      },
      on: () => {},
      removeListener: () => {},
    }
    Object.defineProperty(window, 'ethereum', { value: provider, writable: false })
  })()`
}
