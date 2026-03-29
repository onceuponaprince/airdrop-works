"""Scenario seeding utilities for SPORE launch demos and testing."""

from __future__ import annotations

import hashlib
import random
from dataclasses import dataclass
from datetime import timedelta
from typing import Any

from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone

from apps.spore.models import (
    AuditLog,
    GraphNode,
    GraphQueryRun,
    RelationshipAnalysisRun,
    ScoreRun,
    Tenant,
    TenantMembership,
    UsageDailyCounter,
    UsageEvent,
)
from apps.spore.security.metering import METRIC_TO_TENANT_QUOTA_FIELD
from apps.spore.services.graph import record_observation, upsert_edge, upsert_node


@dataclass
class SporeSeedResult:
    tenant_slug: str
    scenario: str
    users_created: int
    nodes_created: int
    edges_created_or_updated: int
    observations_created_or_updated: int
    score_runs_created: int
    query_runs_created: int
    relationship_runs_created: int
    usage_events_created: int
    audit_logs_created: int

    def to_dict(self) -> dict[str, Any]:
        return {
            "tenant_slug": self.tenant_slug,
            "scenario": self.scenario,
            "users_created": self.users_created,
            "nodes_created": self.nodes_created,
            "edges_created_or_updated": self.edges_created_or_updated,
            "observations_created_or_updated": self.observations_created_or_updated,
            "score_runs_created": self.score_runs_created,
            "query_runs_created": self.query_runs_created,
            "relationship_runs_created": self.relationship_runs_created,
            "usage_events_created": self.usage_events_created,
            "audit_logs_created": self.audit_logs_created,
        }


def make_spore_seed_factory(random_seed: int = 42):
    """Return a deterministic scenario seeder bound to `random_seed`."""
    rng = random.Random(random_seed)

    @transaction.atomic
    def seed_scenario(
        tenant_slug: str,
        *,
        tenant_name: str = "Demo Tenant",
        scenario: str = "twitter_pair",
        days: int = 30,
        content_per_account: int = 20,
        ambient_accounts: int = 8,
        owner_wallet: str | None = None,
    ) -> SporeSeedResult:
        supported_scenarios = {"twitter_pair", "campaign_launch"}
        if scenario not in supported_scenarios:
            raise ValueError(f"Unsupported scenario: {scenario}")
        if content_per_account < 1:
            raise ValueError("content_per_account must be >= 1")
        if ambient_accounts < 0:
            raise ValueError("ambient_accounts must be >= 0")

        user_model = get_user_model()
        created_users = 0
        nodes_created = 0
        edges_written = 0
        observations_written = 0

        tenant, _ = Tenant.objects.get_or_create(
            slug=tenant_slug,
            defaults={"name": tenant_name, "plan": "starter", "is_active": True},
        )
        if tenant.name != tenant_name:
            tenant.name = tenant_name
            tenant.is_active = True
            tenant.save(update_fields=["name", "is_active", "updated_at"])

        if owner_wallet:
            normalized_wallet = owner_wallet.strip().lower()
        else:
            digest = hashlib.md5(tenant_slug.encode("utf-8")).hexdigest()[:40]
            normalized_wallet = f"0x{digest}"

        owner = user_model.objects.filter(wallet_address=normalized_wallet).first()
        if not owner:
            owner = user_model.objects.create(
                username=f"{tenant_slug}-owner",
                wallet_address=normalized_wallet,
                is_active=True,
            )
            owner.set_unusable_password()
            owner.save(update_fields=["password"])
            created_users += 1

        TenantMembership.objects.get_or_create(
            tenant=tenant,
            user=owner,
            defaults={"role": "owner", "is_active": True},
        )

        if scenario == "campaign_launch":
            primary_accounts = ["brand_official", "founder_voice"]
            side_accounts = [f"ambassador_{idx}" for idx in range(1, ambient_accounts + 1)]
            campaign_tags = ["#SPORELaunch", "#BuildInPublic", "#AirdropWorks"]
        else:
            primary_accounts = ["alice_alpha", "bob_beta"]
            side_accounts = [f"ambient_{idx}" for idx in range(1, ambient_accounts + 1)]
            campaign_tags = ["#RelationshipIntel", "#SignalGraph"]
        all_accounts = primary_accounts + side_accounts
        now = timezone.now()

        account_nodes: dict[str, GraphNode] = {}
        for handle in all_accounts:
            node = upsert_node(
                node_key=f"twitter:user:{handle}",
                node_type="account",
                source_platform="twitter",
                title=f"@{handle}",
                payload={"handle": handle, "scenario": scenario},
                ingestion_batch_id=f"seed:{tenant_slug}",
                raw_ref=handle,
            )
            account_nodes[handle] = node
            nodes_created += 1

        score_runs_created = 0
        query_runs_created = 0
        relationship_runs_created = 0
        usage_events_created = 0
        audit_logs_created = 0

        for account in all_accounts:
            authored_node = account_nodes[account]
            for idx in range(content_per_account):
                event_time = now - timedelta(days=rng.randint(0, max(days, 1)))
                content_id = f"{tenant_slug}-{account}-{idx}"
                if scenario == "campaign_launch":
                    text = (
                        f"{account} launch wave {idx}: rollout update, CTA, and creator spotlight "
                        f"with {rng.choice(primary_accounts)} {rng.choice(campaign_tags)}"
                    )
                else:
                    text = (
                        f"{account} post {idx} about growth strategy and collaboration with "
                        f"{rng.choice(primary_accounts)} {rng.choice(campaign_tags)}"
                    )
                content_node = upsert_node(
                    node_key=f"twitter:content:{content_id}",
                    node_type="content",
                    source_platform="twitter",
                    title=f"Simulated Tweet {content_id}",
                    payload={"text": text, "scenario": scenario, "tenant_slug": tenant_slug},
                    ingestion_batch_id=f"seed:{tenant_slug}",
                    raw_ref=content_id,
                )
                nodes_created += 1

                upsert_edge(
                    from_node=authored_node,
                    to_node=content_node,
                    edge_type="authored",
                    source_platform="twitter",
                    weight_delta=1.0,
                    metadata={"seed": True},
                )
                edges_written += 1

                record_observation(
                    source_platform="twitter",
                    source_event_id=f"{content_id}:tweet",
                    event_type="tweet",
                    actor_external_id=account,
                    content_text=text,
                    content_url=f"https://x.com/{account}/status/{content_id}",
                    occurred_at=event_time,
                    payload={"seed": True, "tenant": tenant_slug},
                )
                observations_written += 1

                if account in primary_accounts:
                    target = primary_accounts[1] if account == primary_accounts[0] else primary_accounts[0]
                    upsert_edge(
                        from_node=authored_node,
                        to_node=account_nodes[target],
                        edge_type="mentions",
                        source_platform="twitter",
                        weight_delta=1.0 + (0.3 * rng.random()),
                        metadata={"seed": True, "content_id": content_id},
                    )
                    edges_written += 1
                    record_observation(
                        source_platform="twitter",
                        source_event_id=f"{content_id}:mention:{target}",
                        event_type="mention",
                        actor_external_id=account,
                        target_external_id=target,
                        content_text=text,
                        content_url=f"https://x.com/{account}/status/{content_id}",
                        occurred_at=event_time,
                        payload={"seed": True},
                    )
                    observations_written += 1

                    if rng.random() < 0.6:
                        record_observation(
                            source_platform="twitter",
                            source_event_id=f"{content_id}:reply:{target}",
                            event_type="reply_to",
                            actor_external_id=account,
                            target_external_id=target,
                            content_text=f"reply {idx} from {account} to {target}",
                            occurred_at=event_time,
                            payload={"seed": True},
                        )
                        observations_written += 1
                    if scenario == "campaign_launch" and rng.random() < 0.7:
                        upsert_edge(
                            from_node=content_node,
                            to_node=account_nodes[target],
                            edge_type="interacts",
                            source_platform="twitter",
                            weight_delta=0.7 + (0.4 * rng.random()),
                            metadata={"seed": True, "kind": "cta"},
                        )
                        edges_written += 1
                else:
                    target = rng.choice(primary_accounts)
                    upsert_edge(
                        from_node=authored_node,
                        to_node=account_nodes[target],
                        edge_type="mentions",
                        source_platform="twitter",
                        weight_delta=0.2 + (0.5 * rng.random()),
                        metadata={"seed": True, "content_id": content_id},
                    )
                    edges_written += 1
                    record_observation(
                        source_platform="twitter",
                        source_event_id=f"{content_id}:mention:{target}",
                        event_type="mention",
                        actor_external_id=account,
                        target_external_id=target,
                        content_text=text,
                        content_url=f"https://x.com/{account}/status/{content_id}",
                        occurred_at=event_time,
                        payload={"seed": True},
                    )
                    observations_written += 1
                    if scenario == "campaign_launch" and rng.random() < 0.45:
                        upsert_edge(
                            from_node=account_nodes[primary_accounts[0]],
                            to_node=authored_node,
                            edge_type="interacts",
                            source_platform="twitter",
                            weight_delta=0.3 + (0.5 * rng.random()),
                            metadata={"seed": True, "kind": "amplify"},
                        )
                        edges_written += 1

                ScoreRun.objects.create(
                    tenant=tenant,
                    user=owner,
                    contribution_id=f"seed-{content_id}",
                    source_platform="twitter",
                    score_version="spore-v1-seed",
                    context={"subject_key": content_node.node_key, "scenario": scenario},
                    variable_scores={
                        "text_composite": round(45 + rng.random() * 50, 2),
                        "graph_signal": round(25 + rng.random() * 40, 2),
                    },
                    explainability={
                        "seed": "synthetic generated seed run for launch simulation",
                        "scenario": scenario,
                    },
                    confidence=round(0.45 + rng.random() * 0.5, 4),
                    final_score=int(40 + rng.random() * 60),
                )
                score_runs_created += 1

                if idx < 3 and account in primary_accounts:
                    query_hash = hashlib.md5(f"{tenant_slug}:{account}:{idx}:query".encode()).hexdigest()
                    GraphQueryRun.objects.create(
                        tenant=tenant,
                        user=owner,
                        query_text=f"relationship signal around {account} post {idx}",
                        query_hash=query_hash,
                        hops=2,
                        damping=0.65,
                        top_k=10,
                        seed_nodes=[content_node.node_key, authored_node.node_key],
                        result_count=2,
                        results=[
                            {
                                "node_key": content_node.node_key,
                                "activation": round(0.5 + rng.random(), 5),
                                "node_type": "content",
                                "source_platform": "twitter",
                            },
                            {
                                "node_key": authored_node.node_key,
                                "activation": round(0.2 + rng.random(), 5),
                                "node_type": "account",
                                "source_platform": "twitter",
                            },
                        ],
                    )
                    query_runs_created += 1

                if account in primary_accounts and idx < 4:
                    RelationshipAnalysisRun.objects.create(
                        tenant=tenant,
                        user=owner,
                        account_a=primary_accounts[0],
                        account_b=primary_accounts[1],
                        days=days,
                        features={
                            "mentions_a_to_b": round(3 + rng.random() * 4, 3),
                            "mentions_b_to_a": round(2 + rng.random() * 4, 3),
                            "replies_a_to_b": float(rng.randint(1, 6)),
                            "replies_b_to_a": float(rng.randint(1, 6)),
                            "shared_neighbors": float(rng.randint(2, max(ambient_accounts, 2))),
                            "relationship_strength": round(8 + rng.random() * 14, 3),
                            "confidence": round(0.55 + rng.random() * 0.4, 3),
                        },
                    )
                    relationship_runs_created += 1

                metric = rng.choice(
                    ["spore.query", "spore.ingest", "spore.relationship", "spore.brief_generate", "spore.ops"]
                )
                UsageEvent.objects.create(
                    tenant=tenant,
                    user=owner,
                    metric=metric,
                    units=rng.randint(1, 3),
                    status_code=200,
                    request_id=hashlib.md5(f"{content_id}:{metric}".encode()).hexdigest()[:16],
                    metadata={"seed": True, "scenario": scenario},
                )
                usage_events_created += 1

                if metric in METRIC_TO_TENANT_QUOTA_FIELD:
                    UsageDailyCounter.objects.update_or_create(
                        tenant=tenant,
                        metric=metric,
                        day=now.date(),
                        defaults={"count": max(content_per_account // 2, 1)},
                    )

                AuditLog.objects.create(
                    tenant=tenant,
                    user=owner,
                    action=f"spore.seed.{metric}",
                    target_type="content",
                    target_id=content_id,
                    metadata={"seed": True, "scenario": scenario},
                )
                audit_logs_created += 1

        return SporeSeedResult(
            tenant_slug=tenant.slug,
            scenario=scenario,
            users_created=created_users,
            nodes_created=nodes_created,
            edges_created_or_updated=edges_written,
            observations_created_or_updated=observations_written,
            score_runs_created=score_runs_created,
            query_runs_created=query_runs_created,
            relationship_runs_created=relationship_runs_created,
            usage_events_created=usage_events_created,
            audit_logs_created=audit_logs_created,
        )

    return seed_scenario


def seed_spore_scenario(
    tenant_slug: str,
    *,
    tenant_name: str = "Demo Tenant",
    scenario: str = "twitter_pair",
    days: int = 30,
    content_per_account: int = 20,
    ambient_accounts: int = 8,
    owner_wallet: str | None = None,
    random_seed: int = 42,
) -> SporeSeedResult:
    """Convenience entrypoint for one-off seeding calls."""
    seeder = make_spore_seed_factory(random_seed=random_seed)
    return seeder(
        tenant_slug,
        tenant_name=tenant_name,
        scenario=scenario,
        days=days,
        content_per_account=content_per_account,
        ambient_accounts=ambient_accounts,
        owner_wallet=owner_wallet,
    )
