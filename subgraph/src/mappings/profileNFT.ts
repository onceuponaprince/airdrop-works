// ProfileNFT event handlers
// Tracks profile creation, transfers, and metadata updates

import {
  Transfer as TransferEvent,
  NewURI as NewURIEvent,
} from '../../generated/ProfileNFT/ProfileNFT'
import {
  Profile,
  ProfileTransfer,
  ProfileMetadataUpdate,
  PendingWebhookEvent,
} from '../../generated/schema'
import { BigInt, Address } from '@graphprotocol/graph-ts'

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

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

// Helper to create webhook event
function createWebhookEvent(
  eventType: string,
  eventId: string,
  payload: string,
  timestamp: BigInt
): void {
  let webhook = PendingWebhookEvent.load(eventId)
  if (webhook == null) {
    webhook = new PendingWebhookEvent(eventId)
    webhook.eventType = eventType
    webhook.payload = payload
    webhook.createdAt = timestamp
    webhook.processed = false
    webhook.retryCount = 0
    webhook.save()
  }
}

// Handle Profile NFT Transfer events (profile creation and transfers)
export function handleProfileTransfer(event: TransferEvent): void {
  let from = event.params.from.toHexString().toLowerCase()
  let to = event.params.to.toHexString().toLowerCase()
  let tokenId = event.params.tokenId
  
  // Get or create profile for recipient
  let profile = getOrCreateProfile(to)
  
  // If this is a mint (from 0x0), it's a new profile creation
  if (from == ZERO_ADDRESS) {
    profile.tokenID = tokenId
    profile.createdAt = event.block.timestamp
    profile.updatedAt = event.block.timestamp
    profile.save()
    
    // Create webhook for profile creation
    let payload = `{"type":"ProfileCreated","profileAddress":"${to}","tokenID":"${tokenId.toString()}","txHash":"${event.transaction.hash.toHexString()}"}`
    let webhookId = event.transaction.hash.toHexString() + '-' + event.logIndex.toString() + '-webhook'
    createWebhookEvent('ProfileCreated', webhookId, payload, event.block.timestamp)
  } else {
    // Profile transfer - update both profiles
    let fromProfile = getOrCreateProfile(from)
    fromProfile.updatedAt = event.block.timestamp
    fromProfile.save()
    
    profile.tokenID = tokenId
    profile.updatedAt = event.block.timestamp
    profile.save()
  }
  
  // Create ProfileTransfer record
  let transferId = event.transaction.hash.toHexString() + '-' + event.logIndex.toString()
  let transfer = new ProfileTransfer(transferId)
  transfer.profile = to
  transfer.from = from
  transfer.to = to
  transfer.tokenID = tokenId
  transfer.blockNumber = event.block.number
  transfer.blockTimestamp = event.block.timestamp
  transfer.transactionHash = event.transaction.hash.toHexString()
  transfer.save()
  
  // Create webhook for transfer
  let transferPayload = `{"type":"ProfileTransfer","from":"${from}","to":"${to}","tokenID":"${tokenId.toString()}","txHash":"${event.transaction.hash.toHexString()}"}`
  let transferWebhookId = transferId + '-transfer-webhook'
  createWebhookEvent('ProfileUpdated', transferWebhookId, transferPayload, event.block.timestamp)
}

// Handle Profile metadata URI updates
export function handleNewURI(event: NewURIEvent): void {
  let oldURI = event.params.oldTokenURI
  let newURI = event.params.newTokenURI
  
  // Find the profile by looking up the transaction context
  // In a real implementation, we'd parse the token ID from the transaction
  // For now, we create the update record
  let updateId = event.transaction.hash.toHexString() + '-' + event.logIndex.toString()
  
  // Try to find associated profile from the transaction
  // This is a simplified approach - in production you'd track token ID through the contract call
  let metadataUpdate = new ProfileMetadataUpdate(updateId)
  metadataUpdate.oldURI = oldURI
  metadataUpdate.newURI = newURI
  metadataUpdate.blockNumber = event.block.number
  metadataUpdate.blockTimestamp = event.block.timestamp
  metadataUpdate.transactionHash = event.transaction.hash.toHexString()
  
  // Look for profile in this transaction (simplified)
  // In production, this would parse the token ID from event params if available
  metadataUpdate.profile = ''  // Will be populated by external resolver
  metadataUpdate.save()
  
  // Create webhook
  let payload = `{"type":"ProfileMetadataUpdate","oldURI":"${oldURI}","newURI":"${newURI}","txHash":"${event.transaction.hash.toHexString()}"}`
  let webhookId = updateId + '-webhook'
  createWebhookEvent('ProfileUpdated', webhookId, payload, event.block.timestamp)
}