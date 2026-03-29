"""SPORE scoring composition layer."""

from __future__ import annotations

from typing import Any

from apps.judge.service import score_contribution as judge_score_contribution
from apps.spore.models import ScoreRun
from apps.spore.security.tenancy import default_tenant_for_user
from apps.spore.services.graph import contribution_graph_features
from apps.spore.types import ScoreVector, ScoringContext


def compose_contribution_score(contribution, rubric=None) -> dict[str, Any]:
    text_result = judge_score_contribution(contribution.content_text, rubric=rubric)
    graph_features = contribution_graph_features(contribution)

    relationship_strength = graph_features.get("relationship_strength", 0.0)
    network_reach = graph_features.get("network_reach", 0.0)

    graph_component = min(100.0, relationship_strength * 8.0 + network_reach * 2.0)
    final_score = round((text_result["composite_score"] * 0.8) + (graph_component * 0.2))
    confidence = min(0.99, 0.45 + min(relationship_strength, 20.0) / 50.0 + network_reach / 100.0)

    context = ScoringContext(
        subject_key=f"contribution:{contribution.id}",
        source_platform=contribution.platform,
        graph_features={k: float(v) for k, v in graph_features.items()},
        text_features={
            "teaching_value": float(text_result["teaching_value"]),
            "originality": float(text_result["originality"]),
            "community_impact": float(text_result["community_impact"]),
            "composite_score": float(text_result["composite_score"]),
        },
        metadata={"rubric_id": str(getattr(rubric, "id", ""))},
    )

    score_vector = ScoreVector(
        final_score=int(final_score),
        confidence=float(round(confidence, 4)),
        variables={
            "text_composite": float(text_result["composite_score"]),
            "graph_component": float(round(graph_component, 3)),
            "relationship_strength": float(round(relationship_strength, 3)),
            "network_reach": float(round(network_reach, 3)),
        },
        explainability={
            "text": "LLM-based contribution quality from AI Judge.",
            "graph": "Account relationship and interaction evidence from SPORE graph.",
        },
    )

    run = ScoreRun.objects.create(
        tenant=default_tenant_for_user(contribution.user),
        user=contribution.user,
        contribution_id=str(contribution.id),
        source_platform=contribution.platform,
        score_version="spore-v1",
        context=context.to_dict(),
        variable_scores=score_vector.variables,
        explainability=score_vector.explainability,
        confidence=score_vector.confidence,
        final_score=score_vector.final_score,
    )

    dimension_explanations = dict(text_result.get("dimension_explanations", {}))
    dimension_explanations["spore_graph"] = (
        f"Graph component={graph_component:.2f}, relationship_strength={relationship_strength:.2f}, "
        f"network_reach={network_reach:.2f}, confidence={score_vector.confidence:.2f}, score_run_id={run.id}"
    )

    return {
        "teaching_value": text_result["teaching_value"],
        "originality": text_result["originality"],
        "community_impact": text_result["community_impact"],
        "composite_score": score_vector.final_score,
        "farming_flag": text_result["farming_flag"],
        "farming_explanation": text_result["farming_explanation"],
        "dimension_explanations": dimension_explanations,
        "spore_variable_scores": score_vector.variables,
        "spore_confidence": score_vector.confidence,
        "spore_score_run_id": str(run.id),
    }

