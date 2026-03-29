from rest_framework import serializers


class ScoreRequestSerializer(serializers.Serializer):
    text = serializers.CharField(max_length=5000)
    rubric_id = serializers.UUIDField(required=False)


class ScoreResponseSerializer(serializers.Serializer):
    teaching_value = serializers.IntegerField()
    originality = serializers.IntegerField()
    community_impact = serializers.IntegerField()
    composite_score = serializers.IntegerField()
    farming_flag = serializers.ChoiceField(choices=["genuine", "farming", "ambiguous"])
    farming_explanation = serializers.CharField()
    dimension_explanations = serializers.DictField(child=serializers.CharField())


class ScoreJobRequestSerializer(serializers.Serializer):
    contribution_id = serializers.UUIDField()
