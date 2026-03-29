import hashlib
from datetime import timedelta

from django.conf import settings
from django.db.models import Avg, Q
from django.shortcuts import get_object_or_404
from django.utils.dateparse import parse_datetime
from rest_framework import status
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication

from apps.spore.models import (
    GraphEdge,
    GraphNode,
    GraphQueryRun,
    Observation,
    RelationshipAnalysisRun,
    ScoreRun,
    SporeApiKey,
    TenantMembership,
)
from apps.spore.security.audit import log_audit_event
from apps.spore.security.auth import SporeApiKeyAuthentication
from apps.spore.security.keys import generate_api_key, hash_api_key, key_prefix
from apps.spore.security.metering import QuotaExceededError, enforce_quota_or_raise, meter_usage
from apps.spore.security.tenancy import has_tenant_admin_role, resolve_request_tenant
from apps.spore.serializers import (
    AuditLogSerializer,
    BriefGenerationSerializer,
    GraphNodeSerializer,
    GraphQueryRunSerializer,
    RelationshipAnalysisRunSerializer,
    SporeApiKeyCreateSerializer,
    SporeApiKeySerializer,
    SporeIngestSerializer,
    SporeQuerySerializer,
    SporeScoreRunSerializer,
    SporeSeedScenarioSerializer,
    SporeTenantCreateSerializer,
    TenantSerializer,
    TwitterRelationshipSerializer,
    UsageEventSerializer,
)
from apps.spore.services.graph import spreading_activation, twitter_pair_relationship_features
from apps.spore.services.ingestion import ingest_content, query_seed_nodes_by_text
from apps.spore.services.provisioning import provision_tenant
from apps.spore.services.seeding import seed_spore_scenario


class SporeBaseView(APIView):
    authentication_classes = [SporeApiKeyAuthentication, JWTAuthentication]
    permission_classes = [IsAuthenticated]

    def require_tenant(self, request):
        tenant = resolve_request_tenant(request)
        if not tenant:
            raise PermissionDenied("No active SPORE tenant membership")
        return tenant

    def quota_guard(self, tenant, metric: str):
        try:
            enforce_quota_or_raise(tenant=tenant, metric=metric, units=1)
        except QuotaExceededError as exc:
            raise PermissionDenied(
                f"Quota exceeded for {exc.metric} ({exc.current}/{exc.quota_limit})"
            ) from exc

    def meter(self, request, tenant, metric: str, status_code: int, metadata=None):
        meter_usage(
            tenant=tenant,
            user=request.user,
            api_key=getattr(request, "spore_api_key", None),
            metric=metric,
            status_code=status_code,
            metadata=metadata or {},
        )


class SporeIngestView(SporeBaseView):
    permission_classes = [IsAuthenticated]
    throttle_scope = "spore_ingest"

    def post(self, request):
        tenant = self.require_tenant(request)
        self.quota_guard(tenant, "spore.ingest")
        serializer = SporeIngestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        node = ingest_content(
            source_platform=data["source_platform"],
            external_id=data["external_id"],
            text=data["text"],
            title=data.get("title", ""),
            metadata=data.get("metadata") or {},
            ingestion_batch_id=data.get("ingestion_batch_id", ""),
        )
        log_audit_event(
            tenant=tenant,
            user=request.user,
            api_key=getattr(request, "spore_api_key", None),
            action="spore.ingest",
            target_type="graph_node",
            target_id=str(node.id),
            metadata={"source_platform": data["source_platform"]},
        )
        self.meter(request, tenant, "spore.ingest", status.HTTP_201_CREATED)
        return Response(GraphNodeSerializer(node).data, status=status.HTTP_201_CREATED)


class SporeQueryView(SporeBaseView):
    permission_classes = [IsAuthenticated]
    throttle_scope = "spore_query"

    def post(self, request):
        tenant = self.require_tenant(request)
        self.quota_guard(tenant, "spore.query")
        serializer = SporeQuerySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        seeds = query_seed_nodes_by_text(query_text=data["query_text"], top_k=data["top_k"])
        seed_keys = [node.node_key for node in seeds]
        heat = spreading_activation(
            seed_node_keys=seed_keys,
            hops=data["hops"],
            damping=data["damping"],
            ttl_seconds=settings.SPORE_ACTIVATION_TTL_SECONDS,
        )

        ranked = sorted(heat.items(), key=lambda item: item[1], reverse=True)[: data["top_k"]]
        node_map = {
            node.node_key: node
            for node in GraphNode.objects.filter(node_key__in=[key for key, _ in ranked], is_deleted=False)
        }
        response_rows = []
        for key, activation in ranked:
            node = node_map.get(key)
            if not node:
                continue
            response_rows.append(
                {
                    "node_key": key,
                    "activation": round(float(activation), 5),
                    "node": GraphNodeSerializer(node).data,
                }
            )

        query_hash = hashlib.md5(data["query_text"].strip().encode()).hexdigest()
        compact_results = [
            {
                "node_key": row["node_key"],
                "activation": row["activation"],
                "node_type": row["node"]["node_type"],
                "source_platform": row["node"]["source_platform"],
            }
            for row in response_rows
        ]

        GraphQueryRun.objects.create(
            tenant=tenant,
            user=request.user,
            query_text=data["query_text"],
            query_hash=query_hash,
            hops=data["hops"],
            damping=data["damping"],
            top_k=data["top_k"],
            seed_nodes=seed_keys,
            result_count=len(response_rows),
            results=compact_results,
        )
        log_audit_event(
            tenant=tenant,
            user=request.user,
            api_key=getattr(request, "spore_api_key", None),
            action="spore.query",
            target_type="query_hash",
            target_id=query_hash,
            metadata={"result_count": len(response_rows)},
        )
        self.meter(
            request,
            tenant,
            "spore.query",
            status.HTTP_200_OK,
            metadata={"result_count": len(response_rows)},
        )
        return Response({"query_hash": query_hash, "seed_nodes": seed_keys, "results": response_rows})


class TwitterRelationshipView(SporeBaseView):
    permission_classes = [IsAuthenticated]
    throttle_scope = "spore_relationship"

    def get(self, request):
        tenant = self.require_tenant(request)
        self.quota_guard(tenant, "spore.relationship")
        serializer = TwitterRelationshipSerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        account_a = str(data["account_a"]).strip().lstrip("@").lower()
        account_b = str(data["account_b"]).strip().lstrip("@").lower()
        features = twitter_pair_relationship_features(
            account_a=account_a,
            account_b=account_b,
            days=data["days"],
        )
        RelationshipAnalysisRun.objects.create(
            tenant=tenant,
            user=request.user,
            account_a=account_a,
            account_b=account_b,
            days=data["days"],
            features=features,
        )
        log_audit_event(
            tenant=tenant,
            user=request.user,
            api_key=getattr(request, "spore_api_key", None),
            action="spore.relationship",
            target_type="account_pair",
            target_id=f"{account_a}:{account_b}",
            metadata={"days": data["days"]},
        )
        self.meter(request, tenant, "spore.relationship", status.HTTP_200_OK)
        return Response(
            {
                "account_a": account_a,
                "account_b": account_b,
                "days": data["days"],
                "features": features,
            }
        )


class BriefGenerateView(SporeBaseView):
    permission_classes = [IsAuthenticated]
    throttle_scope = "spore_brief_generate"

    def post(self, request):
        tenant = self.require_tenant(request)
        self.quota_guard(tenant, "spore.brief_generate")
        if not settings.SPORE_ENABLE_PHASE3:
            return Response(
                {"detail": "Phase 3 content generation is disabled"},
                status=status.HTTP_404_NOT_FOUND,
            )

        serializer = BriefGenerationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        concepts = []
        brand = data["brand"]
        objective = data["objective"]
        tone = data["tone"]
        audience = data["audience"]

        for idx in range(data["concept_count"]):
            base = f"{brand} | {objective} | {tone} | {audience} | {idx}"
            digest = hashlib.sha256(base.encode("utf-8")).hexdigest()
            engagement = 55 + (int(digest[:2], 16) % 40)
            risk = int(digest[2:4], 16) % 100
            confidence_low = max(0, engagement - 8 - (risk // 12))
            confidence_high = min(100, engagement + 8 - (risk // 20))
            concepts.append(
                {
                    "title": f"{brand} concept {idx + 1}",
                    "copy": f"[{tone}] {objective} for {audience} on {data['platform']}. Variant {idx + 1}.",
                    "engagement_prediction": engagement,
                    "risk_score": risk,
                    "confidence_interval": [confidence_low, confidence_high],
                    "risk_flags": _risk_flags(risk),
                }
            )

        self.meter(request, tenant, "spore.brief_generate", status.HTTP_200_OK)
        return Response({"concepts": concepts, "model": "phase3-stub-v1"}, status=status.HTTP_200_OK)


class SporeOpsSummaryView(SporeBaseView):
    permission_classes = [IsAuthenticated]
    throttle_scope = "spore_ops"

    def get(self, request):
        tenant = self.require_tenant(request)
        score_runs_queryset = tenant_scoped_score_runs_queryset(request, tenant)
        data = {
            "nodes_total": GraphNode.objects.filter(is_deleted=False).count(),
            "edges_total": GraphEdge.objects.filter(is_deleted=False).count(),
            "observations_total": Observation.objects.count(),
            "score_runs_total": score_runs_queryset.count(),
            "graph_query_runs_total": GraphQueryRun.objects.filter(user=request.user, tenant=tenant).count(),
            "relationship_runs_total": RelationshipAnalysisRun.objects.filter(user=request.user, tenant=tenant).count(),
            "recent_score_runs_24h": score_runs_queryset.filter(
                created_at__gte=timezone_now_minus_hours(24)
            ).count(),
            "avg_final_score": (
                score_runs_queryset.aggregate(avg=Avg("final_score")).get("avg") or 0.0
            ),
        }
        self.meter(request, tenant, "spore.ops", status.HTTP_200_OK)
        return Response(data, status=status.HTTP_200_OK)


class SporeScoreRunsView(SporeBaseView):
    permission_classes = [IsAuthenticated]
    throttle_scope = "spore_ops"

    def get(self, request):
        tenant = self.require_tenant(request)
        try:
            limit = int(request.query_params.get("limit", 20))
        except ValueError:
            limit = 20
        limit = min(max(limit, 1), 100)

        queryset = tenant_scoped_score_runs_queryset(request, tenant).order_by("-created_at")
        source_platform = request.query_params.get("source_platform", "").strip()
        if source_platform:
            queryset = queryset.filter(source_platform=source_platform)

        min_score = request.query_params.get("min_score")
        if min_score is not None:
            try:
                queryset = queryset.filter(final_score__gte=int(min_score))
            except ValueError:
                pass

        max_score = request.query_params.get("max_score")
        if max_score is not None:
            try:
                queryset = queryset.filter(final_score__lte=int(max_score))
            except ValueError:
                pass

        contribution_id = request.query_params.get("contribution_id", "").strip()
        if contribution_id:
            queryset = queryset.filter(contribution_id__icontains=contribution_id)

        created_after = parse_datetime(request.query_params.get("created_after", ""))
        if created_after is not None:
            queryset = queryset.filter(created_at__gte=created_after)

        created_before = parse_datetime(request.query_params.get("created_before", ""))
        if created_before is not None:
            queryset = queryset.filter(created_at__lte=created_before)

        queryset = queryset[:limit]
        return Response(
            {
                "count": len(queryset),
                "results": SporeScoreRunSerializer(queryset, many=True).data,
            },
            status=status.HTTP_200_OK,
        )


class SporeScoreRunDetailView(SporeBaseView):
    permission_classes = [IsAuthenticated]
    throttle_scope = "spore_ops"

    def get(self, request, pk):
        tenant = self.require_tenant(request)
        score_run = get_object_or_404(tenant_scoped_score_runs_queryset(request, tenant), id=pk)
        self.meter(request, tenant, "spore.ops", status.HTTP_200_OK)
        return Response(SporeScoreRunSerializer(score_run).data, status=status.HTTP_200_OK)


class SporeGraphQueryRunsView(SporeBaseView):
    permission_classes = [IsAuthenticated]
    throttle_scope = "spore_ops"

    def get(self, request):
        tenant = self.require_tenant(request)
        try:
            limit = int(request.query_params.get("limit", 20))
        except ValueError:
            limit = 20
        limit = min(max(limit, 1), 100)

        queryset = GraphQueryRun.objects.filter(user=request.user, tenant=tenant).order_by("-created_at")
        query_search = request.query_params.get("query_search", "").strip()
        if query_search:
            queryset = queryset.filter(query_text__icontains=query_search)
        queryset = queryset[:limit]

        return Response(
            {"count": len(queryset), "results": GraphQueryRunSerializer(queryset, many=True).data},
            status=status.HTTP_200_OK,
        )


class SporeRelationshipRunsView(SporeBaseView):
    permission_classes = [IsAuthenticated]
    throttle_scope = "spore_ops"

    def get(self, request):
        tenant = self.require_tenant(request)
        try:
            limit = int(request.query_params.get("limit", 20))
        except ValueError:
            limit = 20
        limit = min(max(limit, 1), 100)

        queryset = RelationshipAnalysisRun.objects.filter(user=request.user, tenant=tenant).order_by("-created_at")
        account_a = request.query_params.get("account_a", "").strip().lstrip("@").lower()
        account_b = request.query_params.get("account_b", "").strip().lstrip("@").lower()
        if account_a:
            queryset = queryset.filter(account_a=account_a)
        if account_b:
            queryset = queryset.filter(account_b=account_b)
        queryset = queryset[:limit]

        return Response(
            {"count": len(queryset), "results": RelationshipAnalysisRunSerializer(queryset, many=True).data},
            status=status.HTTP_200_OK,
        )


class SporeApiKeysView(SporeBaseView):
    permission_classes = [IsAuthenticated]
    throttle_scope = "spore_ops"

    def get(self, request):
        tenant = self.require_tenant(request)
        queryset = SporeApiKey.objects.filter(tenant=tenant).order_by("-created_at")
        return Response(
            {"count": queryset.count(), "results": SporeApiKeySerializer(queryset, many=True).data},
            status=status.HTTP_200_OK,
        )

    def post(self, request):
        tenant = self.require_tenant(request)
        if not has_tenant_admin_role(request):
            raise PermissionDenied("Tenant admin role required to manage API keys")

        serializer = SporeApiKeyCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        if data["tenant_slug"] != tenant.slug and not request.user.is_staff:
            raise PermissionDenied("Cannot create key for another tenant")

        raw_key = generate_api_key()
        api_key = SporeApiKey.objects.create(
            tenant=tenant,
            created_by=request.user,
            name=data["name"],
            prefix=key_prefix(raw_key),
            key_hash=hash_api_key(raw_key),
            metadata=data.get("metadata") or {},
        )
        log_audit_event(
            tenant=tenant,
            user=request.user,
            action="spore.api_key.create",
            target_type="api_key",
            target_id=str(api_key.id),
            metadata={"name": api_key.name},
        )
        return Response(
            {
                "api_key": SporeApiKeySerializer(api_key).data,
                "plaintext_key": raw_key,
            },
            status=status.HTTP_201_CREATED,
        )


class SporeApiKeyRevokeView(SporeBaseView):
    permission_classes = [IsAuthenticated]
    throttle_scope = "spore_ops"

    def post(self, request, pk):
        tenant = self.require_tenant(request)
        if not has_tenant_admin_role(request):
            raise PermissionDenied("Tenant admin role required to revoke API keys")
        api_key = get_object_or_404(SporeApiKey, id=pk, tenant=tenant)
        api_key.is_active = False
        api_key.save(update_fields=["is_active", "updated_at"])
        log_audit_event(
            tenant=tenant,
            user=request.user,
            action="spore.api_key.revoke",
            target_type="api_key",
            target_id=str(api_key.id),
            metadata={"name": api_key.name},
        )
        return Response({"status": "revoked", "id": str(api_key.id)}, status=status.HTTP_200_OK)


class SporeTenantContextView(SporeBaseView):
    permission_classes = [IsAuthenticated]
    throttle_scope = "spore_ops"

    def get(self, request):
        tenant = self.require_tenant(request)
        memberships = TenantMembership.objects.filter(user=request.user, is_active=True, tenant__is_active=True)
        return Response(
            {
                "active_tenant": TenantSerializer(tenant).data,
                "memberships": [
                    {
                        "tenant": TenantSerializer(membership.tenant).data,
                        "role": membership.role,
                    }
                    for membership in memberships.select_related("tenant")
                ],
            }
        )


class SporeTenantsView(SporeBaseView):
    permission_classes = [IsAuthenticated]
    throttle_scope = "spore_ops"

    def post(self, request):
        serializer = SporeTenantCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        if request.user.spore_tenant_memberships.filter(is_active=True).exists():
            raise PermissionDenied("Self-serve tenant creation is limited to users without a tenant")

        result = provision_tenant(
            tenant_slug=data["slug"],
            tenant_name=data["name"],
            plan=data["plan"],
            owner_wallet=request.user.wallet_address or "",
            owner_username=request.user.username,
            owner_email=request.user.email or None,
            owner_user=request.user,
            skip_api_key=True,
        )
        request.spore_tenant = result.tenant
        request.spore_membership_role = "owner"
        log_audit_event(
            tenant=result.tenant,
            user=request.user,
            action="spore.tenant.create",
            target_type="tenant",
            target_id=str(result.tenant.id),
            metadata={"slug": result.tenant.slug, "plan": result.tenant.plan},
        )
        return Response(
            {
                "tenant": TenantSerializer(result.tenant).data,
                "membership_role": "owner",
            },
            status=status.HTTP_201_CREATED,
        )


class SporeSeedScenarioView(SporeBaseView):
    permission_classes = [IsAuthenticated]
    throttle_scope = "spore_ops"

    def post(self, request):
        serializer = SporeSeedScenarioSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        tenant = self.require_tenant(request)
        if tenant.slug != data["tenant_slug"] and not request.user.is_staff:
            raise PermissionDenied("Cannot seed a different tenant")
        if not has_tenant_admin_role(request):
            raise PermissionDenied("Tenant owner/admin role required to seed scenarios")

        result = seed_spore_scenario(
            tenant.slug,
            tenant_name=tenant.name,
            scenario=data["scenario"],
            content_per_account=data["content_per_account"],
            ambient_accounts=data["ambient_accounts"],
            owner_wallet=request.user.wallet_address or "",
        )
        log_audit_event(
            tenant=tenant,
            user=request.user,
            action="spore.seed.scenario",
            target_type="tenant",
            target_id=str(tenant.id),
            metadata={"scenario": data["scenario"]},
        )
        return Response(result.to_dict(), status=status.HTTP_201_CREATED)


class SporeUsageEventsView(SporeBaseView):
    permission_classes = [IsAuthenticated]
    throttle_scope = "spore_ops"

    def get(self, request):
        tenant = self.require_tenant(request)
        try:
            limit = int(request.query_params.get("limit", 20))
        except (TypeError, ValueError):
            limit = 20
        limit = min(max(limit, 1), 100)

        metric = request.query_params.get("metric", "").strip()
        queryset = tenant.usage_events.all().order_by("-created_at")
        if metric:
            queryset = queryset.filter(metric=metric)

        rows = list(queryset[:limit])
        self.meter(request, tenant, "spore.ops", status.HTTP_200_OK)
        return Response(
            {"count": len(rows), "results": UsageEventSerializer(rows, many=True).data},
            status=status.HTTP_200_OK,
        )


class SporeAuditLogsView(SporeBaseView):
    permission_classes = [IsAuthenticated]
    throttle_scope = "spore_ops"

    def get(self, request):
        tenant = self.require_tenant(request)
        try:
            limit = int(request.query_params.get("limit", 20))
        except (TypeError, ValueError):
            limit = 20
        limit = min(max(limit, 1), 100)

        action = request.query_params.get("action", "").strip()
        queryset = tenant.audit_logs.all().order_by("-created_at")
        if action:
            queryset = queryset.filter(action=action)

        rows = list(queryset[:limit])
        self.meter(request, tenant, "spore.ops", status.HTTP_200_OK)
        return Response(
            {"count": len(rows), "results": AuditLogSerializer(rows, many=True).data},
            status=status.HTTP_200_OK,
        )


def _risk_flags(risk: int) -> list[str]:
    if risk >= 75:
        return ["brand_safety_high", "review_required"]
    if risk >= 50:
        return ["brand_safety_medium"]
    return ["brand_safety_low"]


def timezone_now_minus_hours(hours: int):
    from django.utils import timezone

    return timezone.now() - timedelta(hours=hours)


def score_run_queryset_for_request(request):
    queryset = ScoreRun.objects.all()
    if getattr(request.user, "is_staff", False):
        return queryset
    return queryset.filter(user=request.user)


def tenant_scoped_score_runs_queryset(request, tenant):
    base = score_run_queryset_for_request(request)
    if getattr(request.user, "is_staff", False):
        return base.filter(tenant=tenant)
    return base.filter(Q(tenant=tenant) | Q(tenant__isnull=True, user=request.user))

