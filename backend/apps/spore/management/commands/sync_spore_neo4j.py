from django.core.management.base import BaseCommand

from apps.spore.models import GraphEdge, GraphNode
from apps.spore.services.neo4j_client import upsert_graph_edge, upsert_graph_node


class Command(BaseCommand):
    help = "Backfill existing SPORE graph nodes and edges into Neo4j."

    def add_arguments(self, parser):
        parser.add_argument("--node-limit", type=int, default=0)
        parser.add_argument("--edge-limit", type=int, default=0)

    def handle(self, *args, **options):
        node_limit = options["node_limit"]
        edge_limit = options["edge_limit"]

        node_qs = GraphNode.objects.order_by("created_at")
        edge_qs = GraphEdge.objects.select_related("from_node", "to_node").order_by("created_at")
        if node_limit:
            node_qs = node_qs[:node_limit]
        if edge_limit:
            edge_qs = edge_qs[:edge_limit]

        synced_nodes = 0
        synced_edges = 0

        for node in node_qs.iterator():
            if upsert_graph_node(node):
                synced_nodes += 1

        for edge in edge_qs.iterator():
            if upsert_graph_edge(edge):
                synced_edges += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"SPORE Neo4j sync complete: nodes={synced_nodes} edges={synced_edges}"
            )
        )

