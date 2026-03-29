from apps.spore.types import GraphEdge, GraphNode, Observation, ScoreVector, ScoringContext


def test_spore_types_serialize_to_dict():
    observation = Observation(
        source_platform="twitter",
        source_event_id="evt-1",
        event_type="mention",
        actor_external_id="alice",
        target_external_id="bob",
        content_text="hello @bob",
    )
    node = GraphNode(node_key="twitter:user:alice", node_type="account", source_platform="twitter")
    edge = GraphEdge(
        edge_type="mentions",
        from_node_key="twitter:user:alice",
        to_node_key="twitter:user:bob",
        source_platform="twitter",
    )
    context = ScoringContext(
        subject_key="contribution:1",
        source_platform="twitter",
        graph_features={"relationship_strength": 3.5},
        text_features={"composite_score": 70.0},
    )
    score = ScoreVector(
        final_score=72,
        confidence=0.66,
        variables={"graph_component": 75.0},
        explainability={"graph": "interaction signals"},
    )

    assert observation.to_dict()["event_type"] == "mention"
    assert node.to_dict()["node_key"] == "twitter:user:alice"
    assert edge.to_dict()["edge_type"] == "mentions"
    assert context.to_dict()["graph_features"]["relationship_strength"] == 3.5
    assert score.to_dict()["final_score"] == 72

