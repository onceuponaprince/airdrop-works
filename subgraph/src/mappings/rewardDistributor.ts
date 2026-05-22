// RewardDistributor event handlers
// Tracks AI Judge scored rewards, tiers, and batch distributions

import {
  RewardDistributed as RewardDistributedEvent,
  BatchRewardsDistributed as BatchRewardsDistributedEvent,
  RewardTiersUpdated as RewardTiersUpdatedEvent,
} from '../../generated/RewardDistributor/RewardDistributor'
import {
  ContributionReward,
  BatchRewardSummary,
  RewardTierConfig,
  UserStats,
  Profile,
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

// Helper to create webhook event for backend sync
function createWebhookEvent(
  eventType: string,
  webhookId: string,
  payload: string,
  timestamp: BigInt
): void {
  let webhook = new PendingWebhookEvent(webhookId)
  webhook.eventType = eventType
  webhook.payload = payload
  webhook.createdAt = timestamp
  webhook.processed = false
  webhook.retryCount = 0
  webhook.save()
}

export function handleRewardDistributed(event: RewardDistributedEvent): void {
  let contributor = event.params.contributor.toHexString().toLowerCase()
  let score = event.params.score
  let amount = event.params.amount
  let contributionId = event.params.contributionId

  let profile = getOrCreateProfile(contributor)

  // Update profile stats
  profile.totalRewardsEarned = profile.totalRewardsEarned.plus(amount)
  profile.contributionCount = profile.contributionCount.plus(BigInt.fromI32(1))
  profile.save()

  // Create ContributionReward entity
  let rewardId = event.transaction.hash.toHexString() + '-' + event.logIndex.toString()
  let reward = new ContributionReward(rewardId)
  reward.contributor = contributor
  reward.score = score.toI32()
  reward.amount = amount
  reward.contributionId = contributionId
  reward.tier = score.toI32() > 75 ? 'Large' : score.toI32() > 50 ? 'Medium' : score.toI32() > 25 ? 'Small' : 'None'
  reward.blockNumber = event.block.number
  reward.blockTimestamp = event.block.timestamp
  reward.transactionHash = event.transaction.hash.toHexString()
  reward.logIndex = event.logIndex
  reward.save()

  // Update or create UserStats
  let stats = UserStats.load(contributor)
  if (stats == null) {
    stats = new UserStats(contributor)
    stats.profile = contributor
    stats.totalDistributed = BigInt.zero()
    stats.contributionCount = BigInt.zero()
  }
  stats.totalDistributed = stats.totalDistributed.plus(amount)
  stats.contributionCount = stats.contributionCount.plus(BigInt.fromI32(1))
  stats.lastUpdatedAt = event.block.timestamp
  stats.save()

  // Create webhook payload for backend (triggers XP, LootChest, badges)
  let payload = `{"eventType":"ContributionScored","contributor":"${contributor}","score":${score.toString()},"amount":"${amount.toString()}","contributionId":"${contributionId}","tier":"${reward.tier}","txHash":"${event.transaction.hash.toHexString()}"}`
  createWebhookEvent('ContributionScored', rewardId + '-webhook', payload, event.block.timestamp)

  // Also emit RewardDistributed for campaign sync
  let rewardPayload = `{"eventType":"RewardDistributed","contributor":"${contributor}","amount":"${amount.toString()}","txHash":"${event.transaction.hash.toHexString()}"}`
  createWebhookEvent('RewardDistributed', rewardId + '-reward-webhook', rewardPayload, event.block.timestamp)
}

export function handleBatchRewardsDistributed(event: BatchRewardsDistributedEvent): void {
  let count = event.params.count
  let totalAmount = event.params.totalAmount

  let summaryId = event.transaction.hash.toHexString()
  let summary = new BatchRewardSummary(summaryId)
  summary.count = count
  summary.totalAmount = totalAmount
  summary.blockNumber = event.block.number
  summary.blockTimestamp = event.block.timestamp
  summary.transactionHash = event.transaction.hash.toHexString()
  summary.save()

  let payload = `{"eventType":"BatchRewards","count":${count.toString()},"totalAmount":"${totalAmount.toString()}","txHash":"${event.transaction.hash.toHexString()}"}`
  createWebhookEvent('BatchRewards', summaryId + '-webhook', payload, event.block.timestamp)
}

export function handleRewardTiersUpdated(event: RewardTiersUpdatedEvent): void {
  let smallReward = event.params.smallReward
  let mediumReward = event.params.mediumReward
  let largeReward = event.params.largeReward

  let configId = event.transaction.hash.toHexString() + '-' + event.logIndex.toString()
  let config = new RewardTierConfig(configId)
  config.smallReward = smallReward
  config.mediumReward = mediumReward
  config.largeReward = largeReward
  config.blockNumber = event.block.number
  config.blockTimestamp = event.block.timestamp
  config.transactionHash = event.transaction.hash.toHexString()
  config.save()

  let payload = `{"eventType":"TierAchieved","smallReward":"${smallReward.toString()}","mediumReward":"${mediumReward.toString()}","largeReward":"${largeReward.toString()}","txHash":"${event.transaction.hash.toHexString()}"}`
  createWebhookEvent('TierAchieved', configId + '-webhook', payload, event.block.timestamp)
}
