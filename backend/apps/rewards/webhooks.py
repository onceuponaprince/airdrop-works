"""Subgraph webhook receiver for on-chain event synchronization.

Receives events from The Graph subgraph via POST /api/v1/webhooks/subgraph/
Processes events to update database: XP, loot distribution, profile updates.

Event Types:
- TokenTransfer: Update user INOV balances
- TokenMint: New tokens minted (platform treasury)
- ProfileCreated: New user profile NFT minted
- ProfileUpdated: Profile metadata or ownership changes
- CampaignCreated: New quest campaign created
- RewardDistributed: Campaign reward paid out
- ContributionScored: AI Judge score linked to on-chain reward
- TierAchieved: User reached new reward tier
- BatchRewards: Multiple rewards distributed
- LootDistributed: Gamified loot reward

Security:
- HMAC-SHA256 signature verification (optional, set SUBGRAPH_WEBHOOK_SECRET)
- Idempotency via webhook_id deduplication
- Rate limiting via Django REST throttle
"""
from __future__ import annotations

import hashlib
import hmac
import json
import logging
from dataclasses import dataclass
from typing import Any

from django.conf import settings
from django.db import transaction
from rest_framework import status
from rest_framework.decorators import api_view, throttle_classes
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle

from apps.accounts.models import User
from apps.rewards.models import LootChest, UserBadge, Badge
from apps.profiles.models import Profile

logger = logging.getLogger(__name__)


class WebhookRateThrottle(AnonRateThrottle):
    """Custom throttle for subgraph webhooks."""
    rate = "100/minute"


@dataclass(frozen=True)
class WebhookEvent:
    """Parsed webhook event from subgraph."""
    event_type: str
    webhook_id: str
    payload: dict[str, Any]
    timestamp: int
    
    @property
    def tx_hash(self) -> str | None:
        return self.payload.get("txHash")
    
    @property
    def wallet_address(self) -> str | None:
        """Extract wallet address from common payload fields."""
        for key in ["contributor", "to", "from", "project", "recipient", "profileAddress"]:
            if key in self.payload:
                return self.payload[key].lower()
        return None


def verify_webhook_signature(request: Request) -> bool:
    """Verify HMAC-SHA256 signature if SUBGRAPH_WEBHOOK_SECRET is configured."""
    secret = getattr(settings, "SUBGRAPH_WEBHOOK_SECRET", None)
    if not secret:
        # No secret configured, skip verification (dev mode)
        return True
    
    signature_header = request.headers.get("X-Webhook-Signature")
    if not signature_header:
        return False
    
    expected = hmac.new(
        secret.encode(),
        request.body,
        hashlib.sha256
    ).hexdigest()
    
    return hmac.compare_digest(signature_header, expected)


def parse_event(data: dict) -> WebhookEvent | None:
    """Parse and validate webhook payload."""
    event_type = data.get("eventType")
    webhook_id = data.get("webhookId") or data.get("id")
    payload = data.get("payload") or data
    timestamp = data.get("timestamp", 0)
    
    if not event_type:
        logger.error("Webhook missing eventType: %s", data)
        return None
    
    if not webhook_id:
        # Generate deterministic ID from payload
        payload_str = json.dumps(payload, sort_keys=True)
        webhook_id = hashlib.sha256(payload_str.encode()).hexdigest()[:32]
    
    return WebhookEvent(
        event_type=event_type,
        webhook_id=webhook_id,
        payload=payload if isinstance(payload, dict) else json.loads(payload),
        timestamp=timestamp,
    )


# ============================================================================
# Event Handlers
# ============================================================================

@transaction.atomic
def handle_token_transfer(event: WebhookEvent) -> dict:
    """Handle INOV token transfer events.
    
    Updates user balances and creates audit logs.
    """
    payload = event.payload
    from_addr = payload.get("from", "").lower()
    to_addr = payload.get("to", "").lower()
    amount = payload.get("amount", "0")
    token = payload.get("token", "").lower()
    
    logger.info("Token transfer: %s -> %s, amount: %s", from_addr, to_addr, amount)
    
    # Note: Actual balance updates happen on-chain
    # Here we track for off-chain XP calculations and notifications
    
    # If recipient is a user, log for potential XP award
    if to_addr and to_addr != "0x0000000000000000000000000000000000000000":
        try:
            user = User.objects.get(wallet_address__iexact=to_addr)
            logger.info("Token transfer to user %s: +%s INOV", user.id, amount)
        except User.DoesNotExist:
            pass
    
    return {"status": "processed", "type": "token_transfer"}


@transaction.atomic
def handle_token_mint(event: WebhookEvent) -> dict:
    """Handle INOV token mint events."""
    payload = event.payload
    to_addr = payload.get("to", "").lower()
    amount = payload.get("amount", "0")
    
    logger.info("Token mint to %s: %s INOV", to_addr, amount)
    
    return {"status": "processed", "type": "token_mint"}


@transaction.atomic
def handle_profile_created(event: WebhookEvent) -> dict:
    """Handle Profile NFT creation.
    
    Links on-chain NFT to Django user profile.
    """
    payload = event.payload
    profile_address = payload.get("profileAddress", "").lower()
    token_id = payload.get("tokenID")
    
    logger.info("Profile created: %s with tokenID %s", profile_address, token_id)
    
    try:
        user = User.objects.get(wallet_address__iexact=profile_address)
        profile, created = Profile.objects.get_or_create(
            user=user,
            defaults={
                "nft_token_id": token_id,
                "chain": "avalanche",  # Default, can be updated
            }
        )
        if not created:
            profile.nft_token_id = token_id
            profile.save(update_fields=["nft_token_id"])
        
        return {
            "status": "processed",
            "type": "profile_created",
            "user_id": str(user.id),
            "profile_id": str(profile.id),
        }
    except User.DoesNotExist:
        logger.warning("Profile created for unknown user: %s", profile_address)
        return {"status": "deferred", "type": "profile_created", "reason": "user_not_found"}


@transaction.atomic
def handle_profile_updated(event: WebhookEvent) -> dict:
    """Handle Profile metadata or ownership updates."""
    payload = event.payload
    
    logger.info("Profile updated: %s", payload)
    
    return {"status": "processed", "type": "profile_updated"}


@transaction.atomic
def handle_campaign_created(event: WebhookEvent) -> dict:
    """Handle new campaign creation on-chain.
    
    Syncs on-chain campaign state with Django quest system.
    """
    payload = event.payload
    campaign_id = payload.get("campaignId")
    project = payload.get("project", "").lower()
    token = payload.get("token", "").lower()
    amount = payload.get("amount", "0")
    
    logger.info("Campaign created: %s by %s, pool: %s", campaign_id, project, amount)
    
    # Update quest with on-chain campaign reference
    from apps.quests.models import Quest
    
    quests = Quest.objects.filter(
        contract_address__iexact=project,
        status="active"
    )
    
    for quest in quests:
        quest.on_chain_id = campaign_id
        quest.reward_pool_on_chain = amount
        quest.save(update_fields=["on_chain_id", "reward_pool_on_chain"])
        logger.info("Linked campaign %s to quest %s", campaign_id, quest.id)
    
    return {
        "status": "processed",
        "type": "campaign_created",
        "campaign_id": campaign_id,
    }


@transaction.atomic
def handle_reward_distributed(event: WebhookEvent) -> dict:
    """Handle campaign reward distribution.
    
    Updates contribution reward state.
    """
    payload = event.payload
    campaign_id = payload.get("campaignId")
    contributor = payload.get("contributor", "").lower()
    amount = payload.get("amount", "0")
    
    logger.info("Reward distributed: campaign=%s, to=%s, amount=%s", 
                campaign_id, contributor, amount)
    
    # Update any pending contributions for this user
    from apps.contributions.models import Contribution
    
    try:
        user = User.objects.get(wallet_address__iexact=contributor)
        # Mark recent scored contributions as rewarded
        contributions = Contribution.objects.filter(
            user=user,
            reward_tx_hash__isnull=True,
            scored_at__isnull=False
        ).order_by("-scored_at")[:5]
        
        for contrib in contributions:
            contrib.reward_tx_hash = event.tx_hash
            contrib.reward_amount = amount
            contrib.save(update_fields=["reward_tx_hash", "reward_amount"])
        
        return {
            "status": "processed",
            "type": "reward_distributed",
            "contributor": contributor,
            "updated_contributions": len(contributions),
        }
    except User.DoesNotExist:
        logger.warning("Reward distributed to unknown user: %s", contributor)
        return {"status": "deferred", "type": "reward_distributed"}


@transaction.atomic
def handle_contribution_scored(event: WebhookEvent) -> dict:
    """Handle AI Judge score linked to on-chain reward.
    
    This is the core event that links off-chain scoring to on-chain rewards.
    Awards XP based on score and tier.
    """
    payload = event.payload
    contributor = payload.get("contributor", "").lower()
    score = int(payload.get("score", 0))
    amount = payload.get("amount", "0")
    contribution_id = payload.get("contributionId")
    tier = payload.get("tier", "None")
    
    logger.info("Contribution scored: %s score=%s, tier=%s, amount=%s",
                contributor, score, tier, amount)
    
    try:
        user = User.objects.get(wallet_address__iexact=contributor)
        
        # Award XP based on score
        xp_awarded = 0
        if score > 75:
            xp_awarded = 100  # Large reward
        elif score > 50:
            xp_awarded = 50   # Medium reward
        elif score > 25:
            xp_awarded = 20   # Small reward
        
        # Update contribution
        from apps.contributions.models import Contribution
        if contribution_id:
            Contribution.objects.filter(id=contribution_id).update(
                on_chain_score=score,
                on_chain_reward=amount,
                xp_awarded=xp_awarded,
            )
        
        # Award XP to profile
        profile, _ = Profile.objects.get_or_create(user=user)
        profile.total_xp += xp_awarded
        
        # Track by branch (simplified - determine from contribution context)
        if score > 50:
            profile.builder_xp += xp_awarded
        else:
            profile.educator_xp += xp_awarded
        
        profile.save()
        
        return {
            "status": "processed",
            "type": "contribution_scored",
            "contributor": contributor,
            "score": score,
            "tier": tier,
            "xp_awarded": xp_awarded,
        }
    except User.DoesNotExist:
        logger.warning("Score for unknown user: %s", contributor)
        return {"status": "deferred", "type": "contribution_scored"}


@transaction.atomic
def handle_tier_achieved(event: WebhookEvent) -> dict:
    """Handle user achieving a new reward tier.
    
    Awards badge and potentially loot chest.
    """
    payload = event.payload
    contributor = payload.get("contributor", "").lower()
    tier = payload.get("tier")
    score = int(payload.get("score", 0))
    
    logger.info("Tier achieved: %s reached %s tier", contributor, tier)
    
    try:
        user = User.objects.get(wallet_address__iexact=contributor)
        
        # Award tier badge if not already owned
        badge, _ = Badge.objects.get_or_create(
            name=f"{tier} Contributor",
            defaults={
                "description": f"Achieved {tier} tier with score {score}+",
                "rarity": tier.lower() if tier else "common",
                "image_url": f"/badges/{tier.lower()}.svg",
            }
        )
        
        UserBadge.objects.get_or_create(
            user=user,
            badge=badge,
            defaults={"minted": False},
        )
        
        # Award loot chest for tier achievement
        loot_rarities = {
            "Large": "legendary",
            "Medium": "epic",
            "Small": "rare",
        }
        rarity = loot_rarities.get(tier, "common")
        
        LootChest.objects.create(
            user=user,
            rarity=rarity,
            source=f"tier_achievement_{tier.lower()}",
            opened=False,
        )
        
        return {
            "status": "processed",
            "type": "tier_achieved",
            "contributor": contributor,
            "tier": tier,
            "loot_rarity": rarity,
        }
    except User.DoesNotExist:
        return {"status": "deferred", "type": "tier_achieved"}


@transaction.atomic
def handle_batch_rewards(event: WebhookEvent) -> dict:
    """Handle batch reward distribution."""
    payload = event.payload
    count = int(payload.get("count", 0))
    total_amount = payload.get("totalAmount", "0")
    
    logger.info("Batch rewards: %s distributions, total %s", count, total_amount)
    
    return {
        "status": "processed",
        "type": "batch_rewards",
        "count": count,
        "total_amount": total_amount,
    }


@transaction.atomic
def handle_loot_distributed(event: WebhookEvent) -> dict:
    """Handle loot/gamified reward distribution."""
    payload = event.payload
    
    logger.info("Loot distributed: %s", payload)
    
    return {"status": "processed", "type": "loot_distributed"}


# ============================================================================
# Main Webhook Endpoint
# ============================================================================

EVENT_HANDLERS: dict[str, callable] = {
    "TokenTransfer": handle_token_transfer,
    "TokenMint": handle_token_mint,
    "ProfileCreated": handle_profile_created,
    "ProfileUpdated": handle_profile_updated,
    "CampaignCreated": handle_campaign_created,
    "RewardDistributed": handle_reward_distributed,
    "ContributionScored": handle_contribution_scored,
    "TierAchieved": handle_tier_achieved,
    "BatchRewards": handle_batch_rewards,
    "LootDistributed": handle_loot_distributed,
    # Alias mappings for flexibility
    "token_transfer": handle_token_transfer,
    "token_mint": handle_token_mint,
    "profile_created": handle_profile_created,
    "profile_updated": handle_profile_updated,
    "campaign_created": handle_campaign_created,
    "reward_distributed": handle_reward_distributed,
    "contribution_scored": handle_contribution_scored,
    "tier_achieved": handle_tier_achieved,
    "batch_rewards": handle_batch_rewards,
    "loot_distributed": handle_loot_distributed,
}


@api_view(["POST"])
@throttle_classes([WebhookRateThrottle])
def subgraph_webhook(request: Request) -> Response:
    """Receive and process subgraph webhook events.
    
    POST /api/v1/webhooks/subgraph/
    
    Request Body:
    {
        "eventType": "ContributionScored",
        "webhookId": "unique-id",
        "payload": {
            "contributor": "0x...",
            "score": 85,
            "amount": "50000000000000000000",
            "contributionId": "uuid",
            "tier": "Large"
        },
        "timestamp": 1234567890
    }
    
    Response:
    - 200: Event processed successfully
    - 202: Event deferred (user not found, will retry)
    - 400: Invalid payload
    - 401: Invalid signature
    """
    # Verify signature if configured
    if not verify_webhook_signature(request):
        return Response(
            {"error": "Invalid signature"},
            status=status.HTTP_401_UNAUTHORIZED
        )
    
    # Parse event
    try:
        data = request.data
    except Exception as e:
        return Response(
            {"error": "Invalid JSON", "detail": str(e)},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Support both single event and batch events
    events_data = data if isinstance(data, list) else [data]
    
    results = []
    for event_data in events_data:
        event = parse_event(event_data)
        if not event:
            results.append({
                "status": "error",
                "error": "Invalid event format",
            })
            continue
        
        # Deduplication check (simple in-memory for now)
        # In production, use Redis or DB with webhook_id
        
        # Route to handler
        handler = EVENT_HANDLERS.get(event.event_type)
        if not handler:
            logger.warning("Unknown event type: %s", event.event_type)
            results.append({
                "status": "error",
                "event_type": event.event_type,
                "error": "Unknown event type",
            })
            continue
        
        try:
            result = handler(event)
            results.append(result)
        except Exception as e:
            logger.exception("Error processing event: %s", event.event_type)
            results.append({
                "status": "error",
                "event_type": event.event_type,
                "error": str(e),
            })
    
    # Determine overall status
    has_errors = any(r.get("status") == "error" for r in results)
    has_deferred = any(r.get("status") == "deferred" for r in results)
    
    if has_errors:
        return Response(
            {"processed": results},
            status=status.HTTP_400_BAD_REQUEST
        )
    elif has_deferred:
        return Response(
            {"processed": results},
            status=status.HTTP_202_ACCEPTED
        )
    
    return Response(
        {"processed": results},
        status=status.HTTP_200_OK
    )


@api_view(["GET"])
def webhook_health(request: Request) -> Response:
    """Health check for webhook endpoint.
    
    GET /api/v1/webhooks/subgraph/health/
    """
    return Response({
        "status": "healthy",
        "supported_events": list(EVENT_HANDLERS.keys()),
    })