"""Graph write/read helpers and lightweight spreading activation."""

from __future__ import annotations

import hashlib
from collections import deque
from datetime import timedelta
from typing import Any

from django.core.cache import cache
from django.db.models import Count, Sum
from django.utils import timezone

from apps.spore.models import GraphEdge, GraphNode, Observation
from apps.spore.services.neo4j_client import upsert_graph_edge, upsert_graph_node


def content_hash(text: str) -> str:
    return hashlib.sha256(text.strip().encode("utf-8")).hexdigest()


def upsert_node(
    node_key: str,
    node_type: str,
    source_platform: str,
    title: str = "",
    payload: dict[str, Any] | None = None,
    ingestion_batch_id: str = "",
    raw_ref: str = "",
) -> GraphNode:
    node, _ = GraphNode.objects.update_or_create(
        node_key=node_key,
        defaults={
            "node_type": node_type,
            "source_platform": source_platform,
            "title": title[:255],
            "payload": payload or {},
            "ingestion_batch_id": ingestion_batch_id,
            "raw_ref": raw_ref,
            "is_deleted": False,
        },
    )
    upsert_graph_node(node)
    return node


def upsert_edge(
    from_node: GraphNode,
    to_node: GraphNode,
    edge_type: str,
    source_platform: str,
    weight_delta: float = 1.0,
    metadata: dict[str, Any] | None = None,
) -> GraphEdge:
    edge, created = GraphEdge.objects.get_or_create(
        from_node=from_node,
        to_node=to_node,
        edge_type=edge_type,
        source_platform=source_platform,
        defaults={
            "weight": max(weight_delta, 0.01),
            "metadata": metadata or {},
            "last_seen_at": timezone.now(),
            "is_deleted": False,
        },
    )
    if not created:
        edge.weight = max(edge.weight + weight_delta, 0.01)
        edge.metadata = metadata or edge.metadata
        edge.last_seen_at = timezone.now()
        edge.is_deleted = False
        edge.save(update_fields=["weight", "metadata", "last_seen_at", "is_deleted", "updated_at"])
    edge = GraphEdge.objects.select_related("from_node", "to_node").get(pk=edge.pk)
    upsert_graph_edge(edge)
    return edge


def record_observation(
    source_platform: str,
    source_event_id: str,
    event_type: str,
    actor_external_id: str,
    target_external_id: str = "",
    content_text: str = "",
    content_url: str = "",
    occurred_at=None,
    payload: dict[str, Any] | None = None,
) -> Observation:
    observation, _ = Observation.objects.update_or_create(
        source_platform=source_platform,
        source_event_id=source_event_id,
        event_type=event_type,
        defaults={
            "actor_external_id": actor_external_id,
            "target_external_id": target_external_id,
            "content_text": content_text,
            "content_url": content_url,
            "content_hash": content_hash(content_text) if content_text else "",
            "occurred_at": occurred_at,
            "payload": payload or {},
        },
    )
    return observation


def spreading_activation(seed_node_keys: list[str], hops: int, damping: float, ttl_seconds: int) -> dict[str, float]:
    if not seed_node_keys:
        return {}

    heat: dict[str, float] = {key: 1.0 for key in seed_node_keys}
    frontier = deque((key, 0) for key in seed_node_keys)

    while frontier:
        current_key, depth = frontier.popleft()
        if depth >= hops:
            continue

        current_heat = heat.get(current_key, 0.0)
        if current_heat <= 0:
            continue

        edges = (
            GraphEdge.objects.filter(from_node__node_key=current_key, is_deleted=False)
            .select_related("to_node")
            .only("weight", "to_node__node_key")
        )
        for edge in edges:
            next_key = edge.to_node.node_key
            propagated = current_heat * damping * max(edge.weight, 0.01)
            if propagated <= 0:
                continue
            heat[next_key] = heat.get(next_key, 0.0) + propagated
            frontier.append((next_key, depth + 1))

    cache_key = f"spore:activation:{hashlib.md5('|'.join(sorted(seed_node_keys)).encode()).hexdigest()}"
    cache.set(cache_key, heat, timeout=ttl_seconds)
    return heat


def twitter_pair_relationship_features(account_a: str, account_b: str, days: int = 30) -> dict[str, float]:
    a = account_a.strip().lstrip("@").lower()
    b = account_b.strip().lstrip("@").lower()
    if not a or not b:
        return {}

    since = timezone.now() - timedelta(days=days)
    prefix = "twitter:user:"
    a_key = f"{prefix}{a}"
    b_key = f"{prefix}{b}"

    direct_mentions_a_to_b = GraphEdge.objects.filter(
        from_node__node_key=a_key,
        to_node__node_key=b_key,
        edge_type="mentions",
        source_platform="twitter",
        last_seen_at__gte=since,
        is_deleted=False,
    ).aggregate(total=Sum("weight"))["total"] or 0.0

    direct_mentions_b_to_a = GraphEdge.objects.filter(
        from_node__node_key=b_key,
        to_node__node_key=a_key,
        edge_type="mentions",
        source_platform="twitter",
        last_seen_at__gte=since,
        is_deleted=False,
    ).aggregate(total=Sum("weight"))["total"] or 0.0

    obs_base = Observation.objects.filter(
        source_platform="twitter",
        occurred_at__gte=since,
    )
    replies_a_to_b = obs_base.filter(
        event_type="reply_to",
        actor_external_id=a,
        target_external_id=b,
    ).count()
    replies_b_to_a = obs_base.filter(
        event_type="reply_to",
        actor_external_id=b,
        target_external_id=a,
    ).count()

    shared_neighbors = (
        GraphEdge.objects.filter(
            edge_type="mentions",
            source_platform="twitter",
            from_node__node_key__in=[a_key, b_key],
            last_seen_at__gte=since,
            is_deleted=False,
        )
        .values("to_node")
        .annotate(c=Count("to_node"))
        .filter(c__gt=1)
        .count()
    )

    relationship_strength = float(
        direct_mentions_a_to_b
        + direct_mentions_b_to_a
        + replies_a_to_b
        + replies_b_to_a
        + (shared_neighbors * 0.5)
    )
    confidence = min(1.0, relationship_strength / 20.0)

    return {
        "mentions_a_to_b": float(direct_mentions_a_to_b),
        "mentions_b_to_a": float(direct_mentions_b_to_a),
        "replies_a_to_b": float(replies_a_to_b),
        "replies_b_to_a": float(replies_b_to_a),
        "shared_neighbors": float(shared_neighbors),
        "mutual_interaction": float(min(direct_mentions_a_to_b, direct_mentions_b_to_a)),
        "relationship_strength": relationship_strength,
        "confidence": confidence,
    }


def contribution_graph_features(contribution) -> dict[str, float]:
    payload = contribution.dimension_explanations or {}
    mentions = payload.get("spore_mentions", [])
    author = payload.get("spore_author", "")
    if not author or not isinstance(mentions, list):
        return {"relationship_strength": 0.0, "network_reach": 0.0}

    total_strength = 0.0
    for mention in mentions[:10]:
        rel = twitter_pair_relationship_features(author, mention, days=30)
        total_strength += rel.get("relationship_strength", 0.0)

    return {
        "relationship_strength": total_strength,
        "network_reach": float(len(mentions)),
    }

