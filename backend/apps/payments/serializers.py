from rest_framework import serializers


class CheckoutSessionSerializer(serializers.Serializer):
    tenant_slug = serializers.SlugField(max_length=64)
    plan = serializers.ChoiceField(choices=["starter", "growth", "enterprise"])


class PortalSessionSerializer(serializers.Serializer):
    tenant_slug = serializers.SlugField(max_length=64)


class UserCheckoutSerializer(serializers.Serializer):
    plan = serializers.ChoiceField(choices=["pro", "team"], required=False, default="")
    credit_pack = serializers.ChoiceField(choices=["50", "200"], required=False, default="")

    def validate(self, attrs):
        if not attrs.get("plan") and not attrs.get("credit_pack"):
            raise serializers.ValidationError("Provide either 'plan' or 'credit_pack'.")
        if attrs.get("plan") and attrs.get("credit_pack"):
            raise serializers.ValidationError("Provide 'plan' or 'credit_pack', not both.")
        return attrs
