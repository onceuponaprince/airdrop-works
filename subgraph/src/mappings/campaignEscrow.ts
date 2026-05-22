// CampaignEscrow event handlers
// Tracks quest creation, reward distributions, and campaign lifecycle

import {
  CampaignCreated as CampaignCreatedEvent,
  RewardDistributed as RewardDistributedEvent,
  CampaignCompleted as CampaignCompletedEvent,
  CampaignCancelled as CampaignCancelledEvent,
} from '../../generated/CampaignEscrow/CampaignEscrow'
import {
  Campaign,
  CampaignReward,
  CampaignParticipation,
  Profile,
  Token,
  PendingWebhookEvent,
} from '../../generated/schema'
import { BigInt, Address } from '@graphprotocol/graph-ts'

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

// Helper to get or create Token
function getOrCreateToken(address: string): Token {
  let token = Token.load(address)
  if (token == null) {
    token = new Token(address)
    token.name = 'Unknown'
    token.symbol = 'UNK'
    token.decimals = 18
    token.totalSupply = BigInt.zero()
    token.distributor = '0x0000000000000000000000000000000000000000'
    token.save()
  }
  return token
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

// Helper to get or create campaign participation
function getOrCreateCampaignParticipation(user: string, campaignId: string): CampaignParticipation {
  let id = user + '-' + campaignId
  let participation = CampaignParticipation.load(id)
  if (participation == null) {
    participation = new CampaignParticipation(id)
    participation.user = user
    participation.campaign = campaignId
    participation.totalRewards = BigInt.zero()
    participation.rewardCount = 0
    participation.firstRewardAt = BigInt.zero()
    participation.lastRewardAt = BigInt.zero()
    participation.save()
  }
  return participation
}

// Handle CampaignCreated events
export function handleCampaignCreated(event: CampaignCreatedEvent): void {
  let campaignId = event.params.campaignId.toString()
  let project = event.params.project.toHexString().toLowerCase()
  let tokenAddress = event.params.token.toHexString().toLowerCase()
  let amount = event.params.amount
  let endTime = event.params.endTime
  
  // Create campaign entity
  let campaign = new Campaign(campaignId)
  campaign.project = project
  campaign.token = tokenAddress
  campaign.totalPool = amount
  campaign.distributed = BigInt.zero()
  campaign.startTime = event.block.timestamp
  campaign.endTime = endTime
  campaign.status = 'Active'
  campaign.createdAt = event.block.timestamp
  campaign.createdBlock = event.block.number
  campaign.createdTxHash = event.transaction.hash.toHexString()
  campaign.save()
  
  // Ensure token exists
  let token = getOrCreateToken(tokenAddress)
  token.save()
  
  // Ensure project profile exists
  let projectProfile = getOrCreateProfile(project)
  projectProfile.updatedAt = event.block.timestamp
  projectProfile.save()
  
  // Create webhook for campaign creation
  let payload = `{"type":"CampaignCreated","campaignId":"${campaignId}","project":"${project}","token":"${tokenAddress}","amount":"${amount.toString()}","endTime":"${endTime.toString()}","txHash":"${event.transaction.hash.toHexString()}"}`
  let webhookId = event.transaction.hash.toHexString() + '-' + event.logIndex.toString() + '-webhook'
  createWebhookEvent('CampaignCreated', webhookId, payload, event.block.timestamp)
}

// Handle RewardDistributed events
export function handleRewardDistributed(event: RewardDistributedEvent): void {
  let campaignId = event.params.campaignId.toString()
  let contributor = event.params.contributor.toHexString().toLowerCase()
  let amount = event.params.amount
  
  // Get campaign and update distributed amount
  let campaign = Campaign.load(campaignId)
  if (campaign != null) {
    campaign.distributed = campaign.distributed.plus(amount)
    campaign.save()
  }
  
  // Get or create contributor profile
  let contributorProfile = getOrCreateProfile(contributor)
  contributorProfile.totalRewardsEarned = contributorProfile.totalRewardsEarned.plus(amount)
  contributorProfile.updatedAt = event.block.timestamp
  contributorProfile.save()
  
  // Create reward record
  let rewardId = campaignId + '-' + event.transaction.hash.toHexString() + '-' + event.logIndex.toString()
  let reward = new CampaignReward(rewardId)
  reward.campaign = campaignId
  reward.contributor = contributor
  reward.amount = amount
  reward.blockNumber = event.block.number
  reward.blockTimestamp = event.block.timestamp
  reward.transactionHash = event.transaction.hash.toHexString()
  reward.logIndex = event.logIndex
  reward.save()
  
  // Update campaign participation
  let participation = getOrCreateCampaignParticipation(contributor, campaignId)
  participation.totalRewards = participation.totalRewards.plus(amount)
  participation.rewardCount = participation.rewardCount + 1
  if (participation.firstRewardAt == BigInt.zero()) {
    participation.firstRewardAt = event.block.timestamp
  }
  participation.lastRewardAt = event.block.timestamp
  participation.save()
  
  // Create webhook for reward distribution
  let payload = `{"type":"RewardDistributed","campaignId":"${campaignId}","contributor":"${contributor}","amount":"${amount.toString()}","txHash":"${event.transaction.hash.toHexString()}"}`
  let webhookId = rewardId + '-webhook'
  createWebhookEvent('RewardDistributed', webhookId, payload, event.block.timestamp)
}

// Handle CampaignCompleted events
export function handleCampaignCompleted(event: CampaignCompletedEvent): void {
  let campaignId = event.params.campaignId.toString()
  let totalDistributed = event.params.totalDistributed
  
  // Update campaign status
  let campaign = Campaign.load(campaignId)
  if (campaign != null) {
    campaign.status = 'Completed'
    campaign.distributed = totalDistributed
    campaign.save()
  }
  
  // Create webhook
  let payload = `{"type":"CampaignCompleted","campaignId":"${campaignId}","totalDistributed":"${totalDistributed.toString()}","txHash":"${event.transaction.hash.toHexString()}"}`
  let webhookId = event.transaction.hash.toHexString() + '-' + event.logIndex.toString() + '-webhook'
  createWebhookEvent('CampaignCreated', webhookId, payload, event.block.timestamp)
}

// Handle CampaignCancelled events
export function handleCampaignCancelled(event: CampaignCancelledEvent): void {
  let campaignId = event.params.campaignId.toString()
  let refunded = event.params.refunded
  
  // Update campaign status
  let campaign = Campaign.load(campaignId)
  if (campaign != null) {
    campaign.status = 'Cancelled'
    campaign.save()
  }
  
  // Create webhook
  let payload = `{"type":"CampaignCancelled","campaignId":"${campaignId}","refunded":"${refunded.toString()}","txHash":"${event.transaction.hash.toHexString()}"}`
  let webhookId = event.transaction.hash.toHexString() + '-' + event.logIndex.toString() + '-webhook'
  createWebhookEvent('CampaignCreated', webhookId, payload, event.block.timestamp)
}