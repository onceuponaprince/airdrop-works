"""Seed the database with demo data for MVP demonstrations.

Creates sample users, profiles, quests, contributions, leaderboard entries,
and loot so the platform has visible data on first launch.

Usage:
    python manage.py seed_demo            # seed with defaults
    python manage.py seed_demo --flush    # clear existing seed data first
"""

import random
from datetime import timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.utils import timezone


DEMO_USERS = [
    {"wallet": "0x1234567890abcdef1234567890abcdef12345678", "name": "AlphaTrader", "email": "alpha@demo.test"},
    {"wallet": "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd", "name": "CryptoEdu", "email": "edu@demo.test"},
    {"wallet": "0x9876543210fedcba9876543210fedcba98765432", "name": "BuilderDAO", "email": "builder@demo.test"},
    {"wallet": "0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef", "name": "ScoutMaster", "email": "scout@demo.test"},
    {"wallet": "0xcafebabecafebabecafebabecafebabecafebabe", "name": "DiplomatX", "email": "diplomat@demo.test"},
    {"wallet": "0x1111111111111111111111111111111111111111", "name": "WhaleWatch", "email": "whale@demo.test"},
    {"wallet": "0x2222222222222222222222222222222222222222", "name": "DegenDev", "email": "degen@demo.test"},
    {"wallet": "0x3333333333333333333333333333333333333333", "name": "NFTNerd", "email": "nft@demo.test"},
    {"wallet": "0x4444444444444444444444444444444444444444", "name": "YieldFarmer", "email": "yield@demo.test"},
    {"wallet": "0x5555555555555555555555555555555555555555", "name": "ChainReporter", "email": "reporter@demo.test"},
]

SAMPLE_TWEETS = [
    "Thread: How Avalanche subnets enable custom gas tokens and why this matters for gaming 🧵",
    "Just deployed my first Diamond proxy on Base. EIP-2535 is underrated for upgradeable contracts.",
    "Unpopular opinion: Most airdrops reward farming, not genuine community contribution. We need better scoring.",
    "Built a Telegram bot that monitors Uniswap V3 positions and alerts on impermanent loss thresholds.",
    "Comparing ZK-rollup costs: Scroll vs zkSync Era vs Polygon zkEVM. Data from 10k transactions each.",
    "Tutorial: How to set up a Chainlink CCIP cross-chain messaging bridge between Avalanche and Base.",
    "The real alpha is building in public. My open-source MEV protection library just hit 500 stars.",
    "Hot take: DAOs should pay contributors in vesting tokens, not spot. Aligns long-term incentives.",
    "Deep dive into ERC-4337 account abstraction: gas sponsorship, bundlers, and the UX revolution.",
    "I analyzed 50 token launches this month. Here's what separated the 10x from the rugs 📊",
    "PSA: Always verify contract source on Sourcify before interacting. Found 3 honeypots today.",
    "Wrote a guide on integrating Dynamic.xyz for wallet-first auth. Way simpler than I expected.",
    "Why I think social graph protocols (Lens, Farcaster) will be bigger than DeFi in 2 years.",
    "Benchmark: Redis vs Valkey for Celery broker. Valkey wins on p99 latency by 15%.",
    "The future of content scoring is AI judges + human validators. Neither alone is sufficient.",
]

QUEST_TEMPLATES = [
    {"title": "Avalanche Education Sprint", "desc": "Create educational content about Avalanche C-Chain development", "diff": "B", "pool": "500"},
    {"title": "Base Builder Challenge", "desc": "Deploy a smart contract on Base and document the process", "diff": "A", "pool": "1000"},
    {"title": "Community Spotlight", "desc": "Write a thread highlighting underappreciated community contributors", "diff": "C", "pool": "250"},
    {"title": "DeFi Deep Dive", "desc": "Analyze a DeFi protocol's security model and publish findings", "diff": "S", "pool": "2000"},
    {"title": "Cross-Chain Quest", "desc": "Build a demo using CCIP or LayerZero for cross-chain messaging", "diff": "A", "pool": "1500"},
    {"title": "Newcomer Guide", "desc": "Create a beginner-friendly guide to Web3 development", "diff": "D", "pool": "100"},
    {"title": "NFT Innovation Lab", "desc": "Design and mint a dynamic NFT that changes based on on-chain data", "diff": "B", "pool": "750"},
    {"title": "Governance Review", "desc": "Audit a DAO's governance process and propose improvements", "diff": "A", "pool": "1200"},
]


class Command(BaseCommand):
    help = "Seed the database with demo data for MVP demonstrations"

    def add_arguments(self, parser):
        parser.add_argument(
            "--flush",
            action="store_true",
            help="Remove existing demo seed data before creating new data",
        )

    def handle(self, *args, **options):
        from apps.accounts.models import User
        from apps.contributions.models import Contribution
        from apps.leaderboard.models import LeaderboardEntry
        from apps.profiles.models import Profile
        from apps.quests.models import Quest
        from apps.rewards.models import LootChest

        if options["flush"]:
            demo_wallets = [u["wallet"] for u in DEMO_USERS]
            demo_users = User.objects.filter(wallet_address__in=demo_wallets)
            Contribution.objects.filter(user__in=demo_users).delete()
            LeaderboardEntry.objects.filter(user__in=demo_users).delete()
            Quest.objects.filter(project_name="AI(r)Drop Demo").delete()
            demo_users.delete()
            self.stdout.write(self.style.WARNING("Flushed existing demo data"))

        now = timezone.now()
        users_created = 0
        branches = ["educator", "builder", "creator", "scout", "diplomat"]

        for user_data in DEMO_USERS:
            user, created = User.objects.get_or_create(
                wallet_address=user_data["wallet"],
                defaults={
                    "username": user_data["name"].lower(),
                    "email": user_data["email"],
                    "display_name": user_data["name"],
                },
            )
            if not created:
                continue

            users_created += 1

            # Profile is auto-created via signal; update XP values
            profile = Profile.objects.get(user=user)
            profile.total_xp = random.randint(100, 5000)
            for branch in branches:
                setattr(profile, f"{branch}_xp", random.randint(0, profile.total_xp // 3))
            profile.rank = users_created
            profile.save()

            # Create contributions
            num_contributions = random.randint(3, 8)
            for i in range(num_contributions):
                tweet = random.choice(SAMPLE_TWEETS)
                score = random.randint(30, 95)
                farming = random.choice(["genuine", "genuine", "genuine", "ambiguous"])
                platform = random.choice(["twitter", "discord", "telegram"])
                content_id = f"demo-{user_data['wallet'][:8]}-{i}-{random.randint(100000, 999999)}"
                Contribution.objects.create(
                    user=user,
                    platform=platform,
                    platform_content_id=content_id,
                    content_text=tweet,
                    content_url=f"https://twitter.com/{user_data['name']}/status/{random.randint(1700000000000000000, 1900000000000000000)}",
                    teaching_value=random.randint(20, 100),
                    originality=random.randint(20, 100),
                    community_impact=random.randint(20, 100),
                    total_score=score,
                    farming_flag=farming,
                    xp_awarded=score * 2,
                    scored_at=now - timedelta(hours=random.randint(1, 168)),
                )

            # Create loot chests
            for _ in range(random.randint(1, 3)):
                rarity = random.choice(["common", "common", "uncommon", "rare", "epic"])
                LootChest.objects.create(
                    user=user,
                    rarity=rarity,
                    opened=random.choice([True, False]),
                    loot_type="innovator_token" if random.random() > 0.5 else "badge",
                    loot_name=f"{rarity.title()} Reward",
                    loot_amount=random.randint(10, 500),
                )

        # Create quests
        quests_created = 0
        for template in QUEST_TEMPLATES:
            _, created = Quest.objects.get_or_create(
                title=template["title"],
                defaults={
                    "description": template["desc"],
                    "project_name": "AI(r)Drop Demo",
                    "difficulty": template["diff"],
                    "reward_pool": Decimal(template["pool"]),
                    "chain": random.choice(["avalanche", "base"]),
                    "start_date": now - timedelta(days=random.randint(1, 7)),
                    "end_date": now + timedelta(days=random.randint(7, 30)),
                    "max_participants": random.choice([50, 100, 200, None]),
                    "status": "active",
                },
            )
            if created:
                quests_created += 1

        # Rebuild leaderboard
        from apps.leaderboard.tasks import rebuild_leaderboard
        rebuild_leaderboard()

        self.stdout.write(
            self.style.SUCCESS(
                f"Seeded: {users_created} users, "
                f"{Contribution.objects.count()} contributions, "
                f"{quests_created} quests, "
                f"{LeaderboardEntry.objects.count()} leaderboard entries"
            )
        )
