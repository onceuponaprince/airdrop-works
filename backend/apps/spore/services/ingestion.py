"""Ingestion helpers for content and Twitter relationship events."""

from __future__ import annotations

from typing import Any

from apps.spore.models import GraphEdge, GraphNode
from apps.spore.services.embedding import embed_text
from apps.spore.services.graph import record_observation, upsert_edge, upsert_node
from apps.spore.services.qdrant import QdrantVectorClient


def ingest_content(
    source_platform: str,
    external_id: str,
    text: str,
    title: str = "",
    metadata: dict[str, Any] | None = None,
    ingestion_batch_id: str = "",
) -> GraphNode:
    content_node = upsert_node(
        node_key=f"{source_platform}:content:{external_id}",
        node_type="content",
        source_platform=source_platform,
        title=title or text[:120],
        payload={"text": text, **(metadata or {})},
        ingestion_batch_id=ingestion_batch_id,
        raw_ref=external_id,
    )

    vector = embed_text(text)
    client = QdrantVectorClient()
    client.ensure_collection(vector_size=len(vector))
    client.upsert_text_node(
        node_key=content_node.node_key,
        vector=vector,
        payload={
            "node_key": content_node.node_key,
            "node_type": content_node.node_type,
            "source_platform": source_platform,
            "title": content_node.title,
        },
    )
    return content_node


def record_twitter_item(source_handle: str, item) -> None:
    """
    Persist graph entities and observations from one crawled Twitter item.
    `item` is expected to be CrawledItem from contributions.crawlers.
    """
    actor = (item.actor_handle or source_handle or "").strip().lstrip("@").lower()
    if not actor:
        return

    account_node = upsert_node(
        node_key=f"twitter:user:{actor}",
        node_type="account",
        source_platform="twitter",
        title=f"@{actor}",
        payload={"handle": actor, "user_id": item.actor_id},
    )
    content_node = ingest_content(
        source_platform="twitter",
        external_id=item.platform_content_id,
        text=item.content_text,
        title=f"Tweet {item.platform_content_id}",
        metadata={"url": item.content_url, "author": actor},
    )
    upsert_edge(
        from_node=account_node,
        to_node=content_node,
        edge_type="authored",
        source_platform="twitter",
        weight_delta=1.0,
        metadata={"tweet_id": item.platform_content_id},
    )
    record_observation(
        source_platform="twitter",
        source_event_id=item.platform_content_id,
        event_type="tweet",
        actor_external_id=actor,
        content_text=item.content_text,
        content_url=item.content_url,
        occurred_at=item.discovered_at,
        payload={"actor_id": item.actor_id},
    )

    for mention in item.mentions:
        target = mention.strip().lstrip("@").lower()
        if not target:
            continue
        mention_node = upsert_node(
            node_key=f"twitter:user:{target}",
            node_type="account",
            source_platform="twitter",
            title=f"@{target}",
            payload={"handle": target},
        )
        upsert_edge(
            from_node=account_node,
            to_node=mention_node,
            edge_type="mentions",
            source_platform="twitter",
            weight_delta=1.0,
            metadata={"tweet_id": item.platform_content_id},
        )
        upsert_edge(
            from_node=content_node,
            to_node=mention_node,
            edge_type="interacts",
            source_platform="twitter",
            weight_delta=0.8,
            metadata={"type": "mention"},
        )
        record_observation(
            source_platform="twitter",
            source_event_id=f"{item.platform_content_id}:mention:{target}",
            event_type="mention",
            actor_external_id=actor,
            target_external_id=target,
            content_text=item.content_text,
            content_url=item.content_url,
            occurred_at=item.discovered_at,
            payload={"tweet_id": item.platform_content_id},
        )

    for ref in item.referenced_tweets:
        ref_id = str(ref.get("id", "")).strip()
        ref_type = str(ref.get("type", "")).strip()
        if not ref_id or not ref_type:
            continue
        ref_node = upsert_node(
            node_key=f"twitter:content:{ref_id}",
            node_type="content",
            source_platform="twitter",
            title=f"Tweet {ref_id}",
            payload={"placeholder": True},
        )
        edge_type = "reply_to" if ref_type == "replied_to" else "quotes"
        upsert_edge(
            from_node=content_node,
            to_node=ref_node,
            edge_type=edge_type,
            source_platform="twitter",
            weight_delta=1.0,
            metadata={"tweet_id": item.platform_content_id},
        )
        target_handle = ""
        maybe_target = ref.get("target_handle")
        if isinstance(maybe_target, str):
            target_handle = maybe_target.strip().lstrip("@").lower()
        record_observation(
            source_platform="twitter",
            source_event_id=f"{item.platform_content_id}:{edge_type}:{ref_id}",
            event_type=edge_type,
            actor_external_id=actor,
            target_external_id=target_handle,
            content_text=item.content_text,
            content_url=item.content_url,
            occurred_at=item.discovered_at,
            payload={"ref_id": ref_id, "ref_type": ref_type},
        )


def record_reddit_item(subreddit: str, item) -> None:
    """Persist graph entities and observations from one crawled Reddit post."""
    actor = (item.actor_handle or "").strip().lower()
    normalized_subreddit = subreddit.strip().lower()
    metadata = item.metadata or {}

    content_node = ingest_content(
        source_platform="reddit",
        external_id=item.platform_content_id,
        text=item.content_text,
        title=str(metadata.get("title") or f"Reddit post {item.platform_content_id}"),
        metadata={
            "url": item.content_url,
            "author": actor,
            "subreddit": normalized_subreddit,
            "permalink": metadata.get("permalink", ""),
            "external_url": metadata.get("external_url", ""),
        },
    )
    record_observation(
        source_platform="reddit",
        source_event_id=item.platform_content_id,
        event_type="reddit_post",
        actor_external_id=actor,
        content_text=item.content_text,
        content_url=item.content_url,
        occurred_at=item.discovered_at,
        payload={
            "subreddit": normalized_subreddit,
            "author_id": item.actor_id,
        },
    )

    if not actor:
        return

    account_node = upsert_node(
        node_key=f"reddit:user:{actor}",
        node_type="account",
        source_platform="reddit",
        title=f"u/{actor}",
        payload={"handle": actor, "user_id": item.actor_id},
    )
    upsert_edge(
        from_node=account_node,
        to_node=content_node,
        edge_type="authored",
        source_platform="reddit",
        weight_delta=1.0,
        metadata={
            "post_id": item.platform_content_id,
            "subreddit": normalized_subreddit,
        },
    )


def create_semantic_edges_for_node(node: GraphNode, top_k: int = 5) -> int:
    text = (node.payload or {}).get("text", "")
    if not text:
        return 0

    vector = embed_text(text)
    client = QdrantVectorClient()
    matches = client.search(vector=vector, limit=top_k + 1)
    created = 0
    for match in matches:
        payload = match.get("payload") or {}
        target_key = payload.get("node_key")
        if not target_key or target_key == node.node_key:
            continue
        target = GraphNode.objects.filter(node_key=target_key).first()
        if not target:
            continue
        score = float(match.get("score", 0.0))
        if score <= 0:
            continue
        upsert_edge(
            from_node=node,
            to_node=target,
            edge_type="semantic",
            source_platform=node.source_platform,
            weight_delta=max(score, 0.01),
            metadata={"distance_score": score},
        )
        created += 1
    return created


def sporulate_recent_nodes(limit: int = 100) -> int:
    created = 0
    nodes = GraphNode.objects.filter(
        node_type="content",
        is_deleted=False,
    ).order_by("-updated_at")[:limit]
    for node in nodes:
        created += create_semantic_edges_for_node(node=node, top_k=5)
    return created


def query_seed_nodes_by_text(query_text: str, top_k: int) -> list[GraphNode]:
    vector = embed_text(query_text)
    client = QdrantVectorClient()
    matches = client.search(vector=vector, limit=top_k)
    node_keys = [
        match.get("payload", {}).get("node_key")
        for match in matches
        if isinstance(match.get("payload"), dict)
    ]
    node_keys = [key for key in node_keys if key]
    if not node_keys:
        node_keys = (
            GraphNode.objects.filter(node_type="content", is_deleted=False)
            .order_by("-updated_at")
            .values_list("node_key", flat=True)[:top_k]
        )
    nodes = list(GraphNode.objects.filter(node_key__in=node_keys, is_deleted=False))
    return nodes


def edge_weight_lookup(source_key: str, target_key: str) -> float:
    weight = (
        GraphEdge.objects.filter(
            from_node__node_key=source_key,
            to_node__node_key=target_key,
            is_deleted=False,
        )
        .values_list("weight", flat=True)
        .first()
    )
    return float(weight or 0.0)

