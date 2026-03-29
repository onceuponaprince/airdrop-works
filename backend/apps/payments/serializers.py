from rest_framework import serializers


class CheckoutSessionSerializer(serializers.Serializer):
    tenant_slug = serializers.SlugField(max_length=64)
    plan = serializers.ChoiceField(choices=["starter", "growth", "enterprise"])


class PortalSessionSerializer(serializers.Serializer):
    tenant_slug = serializers.SlugField(max_length=64)
