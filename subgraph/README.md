# AI(r)Drop Subgraph

The Graph subgraph for indexing AI(r)Drop smart contract events on Avalanche Fuji (dev) and Base Sepolia.

## Contracts Indexed
- **InnovatorToken** (ERC20): Transfers, Mints, Distributor changes
- **ProfileNFT** (ERC721): Profile creation, transfers, metadata updates
- **CampaignEscrow**: Campaign creation, reward distributions, lifecycle
- **RewardDistributor**: AI-scored rewards, batch payouts, tier configs

## Entities
See `schema.graphql` for full GraphQL schema:
- Profile, UserTokenBalance, TokenTransfer, TokenMint
- Campaign, CampaignReward, ContributionReward
- LootDistribution, UserBadge, PendingWebhookEvent (for backend sync)

## Local Development (graph-node + Docker)

1. Install Graph CLI (global):
   ```bash
   npm install -g @graphprotocol/graph-cli
   ```

2. Start local graph-node (from project root):
   ```bash
   # Requires docker-compose with graph-node, ipfs, postgres
   docker compose -f docker-compose.graph.yml up
   # Or use hosted: https://thegraph.com/studio/
   ```

3. Generate types & build:
   ```bash
   cd subgraph
   graph codegen
   graph build
   ```

4. Deploy locally:
   ```bash
   graph create airdrop-works/local --node http://localhost:8020
   graph deploy airdrop-works/local --ipfs http://localhost:5001 --node http://localhost:8020
   ```

5. Query:
   ```bash
   curl -X POST -H "Content-Type: application/json" \
     --data '{"query":"{ profiles(first:5) { id totalRewardsEarned } }"}' \
     http://localhost:8000/subgraphs/name/airdrop-works/local
   ```

## Hosted Service
- Deploy via https://thegraph.com/studio/ (create subgraph, auth with `graph auth`)
- Update `subgraph.yaml` networks/addresses for mainnet Fuji/Base
- `graph deploy --studio airdrop-works`

## Webhook Integration
Subgraph emits `PendingWebhookEvent` entities. Backend polls or receives via:
`POST /api/v1/webhooks/subgraph/`

See `backend/apps/rewards/webhooks.py` for handlers that:
- Award XP on ContributionScored
- Create LootChest on TierAchieved
- Link rewards to Contributions

## Example Event Flow
1. User completes contribution → AI Judge scores off-chain
2. RewardDistributor emits `RewardDistributed(contributor, score, amount, contributionId)`
3. Subgraph handler creates `ContributionReward` + `PendingWebhookEvent`
4. Backend webhook receives → `handle_contribution_scored`:
   - Updates Profile.total_xp, branch XP
   - Marks Contribution as rewarded
5. If tier Large/Medium → creates LootChest (legendary/epic rarity)

## Status
Subgraph + webhook receiver implemented and wired. Ready for contract deployment addresses update and testing on Fuji.
