/**
 * Build an EIP-4361 SIWE message string for Django wallet-verify.
 */
export function buildSiweMessage(params: {
  domain: string
  address: string
  uri: string
  chainId: number
  nonce?: string
  statement?: string
}): string {
  const nonce = params.nonce ?? crypto.randomUUID()
  const statement = params.statement ?? "Sign in to AI(r)Drop"
  const issuedAt = new Date().toISOString()

  return `${params.domain} wants you to sign in with your Ethereum account:
${params.address}

${statement}

URI: ${params.uri}
Version: 1
Chain ID: ${params.chainId}
Nonce: ${nonce}
Issued At: ${issuedAt}`
}
