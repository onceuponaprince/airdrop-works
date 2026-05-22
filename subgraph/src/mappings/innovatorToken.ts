// InnovatorToken event handlers
// Tracks INOV token transfers and distributor changes

import {
  Transfer as TransferEvent,
  DistributorSet as DistributorSetEvent,
} from '../../generated/InnovatorToken/InnovatorToken'
import {
  TokenTransfer,
  TokenMint,
  DistributorChange,
  Token,
  UserTokenBalance,
  Profile,
  PendingWebhookEvent,
} from '../../generated/schema'
import { Address, BigInt, Bytes, store, json, JSONValue, Value } from '@graphprotocol/graph-ts'

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'
const INNOVATOR_TOKEN_ADDRESS = '{{InnovatorTokenAddress}}'

// Helper to get or create Profile
function getOrCreateProfile(address: string): Profile {
  let profile = Profile.load(address)
  if (profile == null) {
    profile = new Profile(address)
    profile.tokenID = BigInt.zero()
    profile.tokenURI = ''
    profile.createdAt = BigInt.zero()
    profile.updatedAt = BigInt.zero()
    profile.totalRewardsEarned = BigInt.zero()
    profile.contributionCount = BigInt.zero()
    profile.save()
  }
  return profile
}

// Helper to get or create Token entity
function getOrCreateToken(address: string): Token {
  let token = Token.load(address)
  if (token == null) {
    token = new Token(address)
    token.name = 'InnovatorToken'
    token.symbol = 'INOV'
    token.decimals = 18
    token.totalSupply = BigInt.zero()
    token.distributor = ZERO_ADDRESS
    token.save()
  }
  return token
}

// Helper to get or create UserTokenBalance
function getOrCreateUserBalance(user: string, token: string): UserTokenBalance {
  let id = user + '-' + token
  let balance = UserTokenBalance.load(id)
  if (balance == null) {
    balance = new UserTokenBalance(id)
    balance.user = user
    balance.token = token
    balance.balance = BigInt.zero()
    balance.totalReceived = BigInt.zero()
    balance.totalSent = BigInt.zero()
    balance.lastUpdatedAt = BigInt.zero()
    balance.save()
  }
  return balance
}

// Helper to create webhook event for backend sync
function createWebhookEvent(
  eventType: string,
  eventId: string,
  payload: string,
  timestamp: BigInt
): void {
  let webhook = new PendingWebhookEvent(eventId)
  webhook.eventType = eventType
  webhook.payload = payload
  webhook.createdAt = timestamp
  webhook.processed = false
  webhook.retryCount = 0
  webhook.save()
}

// Handle ERC20 Transfer events
export function handleTransfer(event: TransferEvent): void {
  let from = event.params.from.toHexString().toLowerCase()
  let to = event.params.to.toHexString().toLowerCase()
  let value = event.params.value
  let tokenAddress = event.address.toHexString().toLowerCase()
  
  // Get or create entities
  let token = getOrCreateToken(tokenAddress)
  let fromProfile = getOrCreateProfile(from)
  let toProfile = getOrCreateProfile(to)
  
  // Update balances
  let fromBalance = getOrCreateUserBalance(from, tokenAddress)
  fromBalance.balance = fromBalance.balance.minus(value)
  fromBalance.totalSent = fromBalance.totalSent.plus(value)
  fromBalance.lastUpdatedAt = event.block.timestamp
  fromBalance.save()
  
  let toBalance = getOrCreateUserBalance(to, tokenAddress)
  toBalance.balance = toBalance.balance.plus(value)
  toBalance.totalReceived = toBalance.totalReceived.plus(value)
  toBalance.lastUpdatedAt = event.block.timestamp
  toBalance.save()
  
  // Create TokenTransfer event
  let transferId = event.transaction.hash.toHexString() + '-' + event.logIndex.toString()
  let transfer = new TokenTransfer(transferId)
  transfer.token = tokenAddress
  transfer.from = from
  transfer.to = to
  transfer.amount = value
  transfer.blockNumber = event.block.number
  transfer.blockTimestamp = event.block.timestamp
  transfer.transactionHash = event.transaction.hash.toHexString()
  transfer.logIndex = event.logIndex
  transfer.save()
  
  // Handle mint (Transfer from 0x0)
  if (from == ZERO_ADDRESS) {
    token.totalSupply = token.totalSupply.plus(value)
    token.save()
    
    let mintId = event.transaction.hash.toHexString() + '-mint-' + event.logIndex.toString()
    let mint = new TokenMint(mintId)
    mint.token = tokenAddress
    mint.to = to
    mint.amount = value
    mint.blockNumber = event.block.number
    mint.blockTimestamp = event.block.timestamp
    mint.transactionHash = event.transaction.hash.toHexString()
    mint.save()
    
    // Create webhook for mint event
    let payload = `{"type":"TokenMint","token":"${tokenAddress}","to":"${to}","amount":"${value.toString()}","txHash":"${event.transaction.hash.toHexString()}"}`
    createWebhookEvent('TokenMint', transferId + '-webhook', payload, event.block.timestamp)
  }
  
  // Create webhook for all transfers
  let transferPayload = `{"type":"TokenTransfer","token":"${tokenAddress}","from":"${from}","to":"${to}","amount":"${value.toString()}","txHash":"${event.transaction.hash.toHexString()}"}`
  createWebhookEvent('TokenTransfer', transferId + '-webhook', transferPayload, event.block.timestamp)
}

// Handle DistributorSet events
export function handleDistributorSet(event: DistributorSetEvent): void {
  let tokenAddress = event.address.toHexString().toLowerCase()
  let token = getOrCreateToken(tokenAddress)
  
  let oldDistributor = event.params.oldDistributor.toHexString().toLowerCase()
  let newDistributor = event.params.newDistributor.toHexString().toLowerCase()
  
  token.distributor = newDistributor
  token.save()
  
  // Create DistributorChange event
  let changeId = event.transaction.hash.toHexString() + '-' + event.logIndex.toString()
  let change = new DistributorChange(changeId)
  change.token = tokenAddress
  change.oldDistributor = oldDistributor
  change.newDistributor = newDistributor
  change.blockNumber = event.block.number
  change.blockTimestamp = event.block.timestamp
  change.transactionHash = event.transaction.hash.toHexString()
  change.save()
  
  // Create webhook
  let payload = `{"type":"DistributorSet","token":"${tokenAddress}","oldDistributor":"${oldDistributor}","newDistributor":"${newDistributor}","txHash":"${event.transaction.hash.toHexString()}"}`
  createWebhookEvent('TokenTransfer', changeId + '-webhook', payload, event.block.timestamp)
}