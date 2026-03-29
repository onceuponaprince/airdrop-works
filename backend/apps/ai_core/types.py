from dataclasses import dataclass
from typing import Literal


FarmingFlag = Literal["genuine", "farming", "ambiguous"]


@dataclass(frozen=True)
class ScoreResult:
    teaching_value: int
    originality: int
    community_impact: int
    composite_score: int
    farming_flag: FarmingFlag
    farming_explanation: str
    dimension_explanations: dict[str, str]

    def to_dict(self) -> dict:
        return {
            "teaching_value": self.teaching_value,
            "originality": self.originality,
            "community_impact": self.community_impact,
            "composite_score": self.composite_score,
            "farming_flag": self.farming_flag,
            "farming_explanation": self.farming_explanation,
            "dimension_explanations": self.dimension_explanations,
        }
