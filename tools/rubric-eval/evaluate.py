#!/usr/bin/env python3
"""Local rubric evaluation harness — heuristic scoring without API keys."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path


def load_rubric(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def score_marketing(text: str, rubric: dict) -> dict:
    words = len(text.split())
    hook = min(100, 40 + words * 2)
    clarity = min(100, 50 + len(text) // 20)
    audience = 65
    cta = 70 if any(w in text.lower() for w in ("join", "start", "get", "try", "today")) else 45
    fatigue = max(0, 80 - words)
    dims = {}
    for d in rubric.get("dimensions", []):
        did = d["id"]
        if did == "hook":
            dims[did] = hook
        elif did == "clarity":
            dims[did] = clarity
        elif did == "audience_fit":
            dims[did] = audience
        elif did == "cta_strength":
            dims[did] = cta
        elif did == "fatigue_risk":
            dims[did] = fatigue
    composite = 0.0
    for d in rubric.get("dimensions", []):
        w = float(d.get("weight", 0))
        val = float(dims.get(d["id"], 0))
        if d.get("invert"):
            val = 100 - val
        composite += w * val
    return {
        "rubricKey": rubric["key"],
        "compositeScore": round(composite),
        "dimensions": dims,
        "engine": "heuristic-local",
    }


def score_contribution(text: str, rubric: dict) -> dict:
    words = len(text.split())
    teaching = min(100, 30 + words * 3)
    originality = min(100, 40 + len(set(text.lower().split())) * 2)
    impact = min(100, 35 + words * 2)
    dims = {
        "teaching_value": teaching,
        "originality": originality,
        "community_impact": impact,
    }
    composite = round(
        sum(
            dims[d["id"]] * float(d.get("weight", 0))
            for d in rubric.get("dimensions", [])
            if d["id"] in dims
        )
    )
    return {
        "rubricKey": rubric["key"],
        "compositeScore": composite,
        "dimensions": dims,
        "farmingFlag": "ambiguous",
        "engine": "heuristic-local",
    }


def evaluate(text: str, rubric: dict) -> dict:
    key = rubric.get("key", "")
    if "marketing" in key:
        return score_marketing(text, rubric)
    return score_contribution(text, rubric)


def main() -> int:
    parser = argparse.ArgumentParser(description="Score text against an Open Rubric JSON file")
    parser.add_argument("--rubric", required=True, type=Path, help="Path to rubric JSON")
    parser.add_argument("--text", required=True, help="Content to score")
    parser.add_argument("--quiet", action="store_true", help="Only print composite score")
    args = parser.parse_args()

    rubric = load_rubric(args.rubric)
    result = evaluate(args.text.strip(), rubric)
    if args.quiet:
        print(result["compositeScore"])
    else:
        print(json.dumps(result, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
