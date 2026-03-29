"""Shared typed schemas for SPORE ingestion and scoring."""

from dataclasses import asdict, dataclass, field
from datetime import datetime
from typing import Any, Literal

NodeType = Literal["account", "content", "entity", "signal"]
EdgeType = Literal[
    "authored",
    "mentions",
    "reply_to",
    "quotes",
    "semantic",
    "interacts",
    "follows",
    "co_occurs",
]
SourcePlatform = Literal["twitter", "discord", "telegram", "github", "manual"]


@dataclass(frozen=True)
class Observation:
    source_platform: SourcePlatform
    source_event_id: str
    event_type: str
    actor_external_id: str
    target_external_id: str = ""
    content_text: str = ""
    content_url: str = ""
    occurred_at: datetime | None = None
    payload: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass(frozen=True)
class GraphNode:
    node_key: str
    node_type: NodeType
    title: str = ""
    source_platform: SourcePlatform = "manual"
    payload: dict[str, Any] = field(default_factory=dict)
    ingestion_batch_id: str = ""
    raw_ref: str = ""

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass(frozen=True)
class GraphEdge:
    edge_type: EdgeType
    from_node_key: str
    to_node_key: str
    weight: float = 1.0
    source_platform: SourcePlatform = "manual"
    metadata: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass(frozen=True)
class ScoringContext:
    subject_key: str
    source_platform: SourcePlatform
    graph_features: dict[str, float] = field(default_factory=dict)
    text_features: dict[str, float] = field(default_factory=dict)
    niche_register: dict[str, float] = field(default_factory=dict)
    metadata: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass(frozen=True)
class ScoreVector:
    final_score: int
    confidence: float
    variables: dict[str, float]
    explainability: dict[str, str] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)

