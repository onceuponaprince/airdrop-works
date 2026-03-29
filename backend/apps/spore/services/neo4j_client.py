"""Neo4j graph sync helpers for SPORE."""

from __future__ import annotations

import json
import logging
from typing import Any

from django.conf import settings
from neo4j import GraphDatabase

from apps.spore.models import GraphEdge, GraphNode

logger = logging.getLogger(__name__)

_driver = None


def _is_enabled() -> bool:
    return bool(getattr(settings, "SPORE_NEO4J_ENABLED", False))


def _serialize_json(value: Any) -> str:
    return json.dumps(value or {}, default=str, sort_keys=True)


def _get_driver():
    global _driver
    if not _is_enabled():
        return None
    if _driver is None:
        _driver = GraphDatabase.driver(
            settings.SPORE_NEO4J_URI,
            auth=(settings.SPORE_NEO4J_USER, settings.SPORE_NEO4J_PASSWORD),
        )
    return _driver


def _run_write(query: str, parameters: dict[str, Any]) -> bool:
    driver = _get_driver()
    if driver is None:
        return False

    try:
        with driver.session(database=settings.SPORE_NEO4J_DATABASE) as session:
            session.run(query, parameters)
        return True
    except Exception as exc:  # noqa: BLE001
        logger.warning("[SPORE/Neo4j] write failed: %s", exc)
        return False


def upsert_graph_node(node: GraphNode) -> bool:
    return _run_write(
        """
        MERGE (n:SporeNode {node_key: $node_key})
        SET n.node_type = $node_type,
            n.source_platform = $source_platform,
            n.title = $title,
            n.ingestion_batch_id = $ingestion_batch_id,
            n.raw_ref = $raw_ref,
            n.payload_json = $payload_json,
            n.is_deleted = $is_deleted,
            n.updated_at = $updated_at
        """,
        {
            "node_key": node.node_key,
            "node_type": node.node_type,
            "source_platform": node.source_platform,
            "title": node.title,
            "ingestion_batch_id": node.ingestion_batch_id,
            "raw_ref": node.raw_ref,
            "payload_json": _serialize_json(node.payload),
            "is_deleted": node.is_deleted,
            "updated_at": node.updated_at.isoformat(),
        },
    )


def upsert_graph_edge(edge: GraphEdge) -> bool:
    return _run_write(
        """
        MERGE (from_node:SporeNode {node_key: $from_node_key})
        MERGE (to_node:SporeNode {node_key: $to_node_key})
        MERGE (from_node)-[r:SPORE_EDGE {
            from_node_key: $from_node_key,
            to_node_key: $to_node_key,
            edge_type: $edge_type,
            source_platform: $source_platform
        }]->(to_node)
        SET r.weight = $weight,
            r.metadata_json = $metadata_json,
            r.is_deleted = $is_deleted,
            r.last_seen_at = $last_seen_at,
            r.updated_at = $updated_at
        """,
        {
            "from_node_key": edge.from_node.node_key,
            "to_node_key": edge.to_node.node_key,
            "edge_type": edge.edge_type,
            "source_platform": edge.source_platform,
            "weight": float(edge.weight),
            "metadata_json": _serialize_json(edge.metadata),
            "is_deleted": edge.is_deleted,
            "last_seen_at": edge.last_seen_at.isoformat() if edge.last_seen_at else "",
            "updated_at": edge.updated_at.isoformat(),
        },
    )

