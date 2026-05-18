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


class TwitterSnsAnalysisRequestSerializer(serializers.Serializer):
    mode = serializers.ChoiceField(choices=["keyword", "account"], default="keyword")
    keyword_or_account = serializers.CharField(max_length=255)
    current_user_text = serializers.CharField(max_length=5000)
    current_user_account_text = serializers.CharField(max_length=5000, required=False, allow_blank=True)
    top_n = serializers.IntegerField(required=False, min_value=1, max_value=20, default=5)
