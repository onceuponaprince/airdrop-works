from rest_framework import serializers
from .models import ScoringRubric, JudgeCache


# Rubric API Serializer (Function 5)
class RubricSerializer(serializers.ModelSerializer):
    """Serializes ScoringRubric for CRUD operations.

    Weight validation: teaching_value_weight + originality_weight + community_impact_weight
    should sum to ~1.0 (100%). Non-blocking warning if not exactly 1.0.
    """

    description = serializers.CharField(required=False, allow_blank=True)
    teachingValueWeight = serializers.FloatField(
        source="teaching_value_weight",
        help_text="Weight for teaching value dimension (0.0-1.0)",
    )
    originalityWeight = serializers.FloatField(
        source="originality_weight",
        help_text="Weight for originality dimension (0.0-1.0)",
    )
    communityImpactWeight = serializers.FloatField(
        source="community_impact_weight",
        help_text="Weight for community impact dimension (0.0-1.0)",
    )
    isDefault = serializers.BooleanField(
        source="is_default",
        help_text="Mark as default rubric for new scoring",
    )
    customInstructions = serializers.CharField(
        source="custom_instructions",
        required=False,
        allow_blank=True,
    )
    
    class Meta:
        model = ScoringRubric
        fields = [
            "id",
            "name",
            "description",
            "teachingValueWeight",
            "originalityWeight",
            "communityImpactWeight",
            "customInstructions",
            "isDefault",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]
    
    def validate(self, data):
        """Validate that weights are valid and sum to approximately 1.0."""
        teaching = data.get("teaching_value_weight", 0)
        originality = data.get("originality_weight", 0)
        community = data.get("community_impact_weight", 0)

        # Check individual weights are in valid range
        for weight in [teaching, originality, community]:
            if weight < 0 or weight > 1:
                raise serializers.ValidationError(
                    "Each weight must be between 0.0 and 1.0"
                )

        # Check sum is approximately 1.0 (with 0.01 tolerance for floating point)
        weight_sum = teaching + originality + community
        if abs(weight_sum - 1.0) > 0.01:
            # Non-blocking warning: log but don't fail
            self.context.setdefault('warnings', []).append(
                f"Weights sum to {weight_sum:.3f}, not 1.0. Scores may be skewed."
            )

        return data
    
    def to_representation(self, instance):
        """Convert model fields to camelCase for API response."""
        data = super().to_representation(instance)
        data['weightSum'] = (
            instance.teaching_value_weight +
            instance.originality_weight +
            instance.community_impact_weight
        )
        return data
