"""Open Rubric spec — export DB rubrics to versioned JSON catalog format."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from django.conf import settings

from .models import ScoringRubric

SPEC_VERSION = "1.0.0"
OPEN_LICENSE = "CC-BY-4.0"
SCHEMA_REL_PATH = "schemas/rubric/v1/rubric-spec.schema.json"
CHANGELOG_REL_PATH = "schemas/rubric/CHANGELOG.md"

CONTRIBUTION_DIMENSIONS = [
    {"id": "teaching_value", "label": "Teaching Value"},
    {"id": "originality", "label": "Originality"},
    {"id": "community_impact", "label": "Community Impact"},
]

CONTRIBUTION_SIGNALS = [
    {"id": "farming_flag", "type": "enum", "values": ["genuine", "farming", "ambiguous"]},
]


def repo_root() -> Path:
    return Path(settings.BASE_DIR).parent


def schema_file_path() -> Path:
    return repo_root() / SCHEMA_REL_PATH


def load_schema_json() -> dict[str, Any]:
    path = schema_file_path()
    if not path.is_file():
        return {}
    return json.loads(path.read_text(encoding="utf-8"))


def _dimensions_from_config(rubric: ScoringRubric) -> list[dict[str, Any]]:
    config = rubric.dimension_config or {}
    dims = config.get("dimensions")
    if dims:
        return [
            {
                "id": d["id"],
                "weight": float(d.get("weight", 0)),
                "label": d.get("label", d["id"]),
                **({"invert": True} if d.get("invert") else {}),
                **({"description": d["description"]} if d.get("description") else {}),
            }
            for d in dims
        ]
    return [
        {
            "id": "teaching_value",
            "weight": rubric.teaching_value_weight,
            "label": "Teaching Value",
        },
        {
            "id": "originality",
            "weight": rubric.originality_weight,
            "label": "Originality",
        },
        {
            "id": "community_impact",
            "weight": rubric.community_impact_weight,
            "label": "Community Impact",
        },
    ]


def rubric_to_open_spec(rubric: ScoringRubric) -> dict[str, Any]:
    """Serialize a ScoringRubric row to OpenRubric JSON."""
    key = rubric.key or (
        "contribution_quality_v1" if rubric.is_default else None
    )
    if not key:
        raise ValueError("Rubric has no stable key")

    payload: dict[str, Any] = {
        "key": key,
        "specVersion": SPEC_VERSION,
        "name": rubric.name,
        "description": rubric.description or "",
        "license": OPEN_LICENSE,
        "revision": rubric.updated_at.isoformat().replace("+00:00", "Z"),
        "dimensions": _dimensions_from_config(rubric),
    }
    if rubric.custom_instructions:
        payload["customInstructions"] = rubric.custom_instructions
    if key == "contribution_quality_v1":
        payload["signals"] = CONTRIBUTION_SIGNALS
    return payload


def list_catalog_rubrics() -> list[ScoringRubric]:
    """Rubrics exposed in the public OSS catalog."""
    keyed = ScoringRubric.objects.exclude(key__isnull=True).exclude(key="")
    default = ScoringRubric.objects.filter(is_default=True).first()
    if default and not keyed.filter(pk=default.pk).exists():
        return list(keyed) + [default]
    return list(keyed.order_by("key"))
