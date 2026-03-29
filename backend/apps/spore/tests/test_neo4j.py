from unittest.mock import patch

from django.core.management import call_command
from django.test import TestCase, override_settings

from apps.spore.models import GraphNode
from apps.spore.services.graph import upsert_edge, upsert_node
from apps.spore.services.neo4j_client import upsert_graph_node


class SporeNeo4jTests(TestCase):
    @override_settings(SPORE_NEO4J_ENABLED=False)
    def test_neo4j_sync_is_noop_when_disabled(self):
        node = GraphNode.objects.create(
            node_key="manual:content:no-neo4j",
            node_type="content",
            source_platform="manual",
            title="Disabled sync",
        )

        self.assertFalse(upsert_graph_node(node))

    @patch("apps.spore.services.graph.upsert_graph_node")
    def test_upsert_node_triggers_neo4j_sync(self, upsert_graph_node_mock):
        node = upsert_node(
            node_key="manual:content:dual-write-node",
            node_type="content",
            source_platform="manual",
            title="Dual write node",
            payload={"text": "hello"},
        )

        upsert_graph_node_mock.assert_called_once_with(node)

    @patch("apps.spore.services.graph.upsert_graph_edge")
    def test_upsert_edge_triggers_neo4j_sync(self, upsert_graph_edge_mock):
        source = GraphNode.objects.create(
            node_key="manual:content:source",
            node_type="content",
            source_platform="manual",
            title="Source",
        )
        target = GraphNode.objects.create(
            node_key="manual:content:target",
            node_type="content",
            source_platform="manual",
            title="Target",
        )

        edge = upsert_edge(
            from_node=source,
            to_node=target,
            edge_type="semantic",
            source_platform="manual",
            weight_delta=0.9,
            metadata={"source": "test"},
        )

        upsert_graph_edge_mock.assert_called_once()
        synced_edge = upsert_graph_edge_mock.call_args.args[0]
        self.assertEqual(synced_edge.pk, edge.pk)
        self.assertEqual(synced_edge.from_node.node_key, source.node_key)
        self.assertEqual(synced_edge.to_node.node_key, target.node_key)

    @patch("apps.spore.management.commands.sync_spore_neo4j.upsert_graph_edge", return_value=True)
    @patch("apps.spore.management.commands.sync_spore_neo4j.upsert_graph_node", return_value=True)
    def test_sync_command_backfills_existing_graph(
        self,
        upsert_graph_node_mock,
        upsert_graph_edge_mock,
    ):
        source = GraphNode.objects.create(
            node_key="manual:content:cmd-source",
            node_type="content",
            source_platform="manual",
            title="Source",
        )
        target = GraphNode.objects.create(
            node_key="manual:content:cmd-target",
            node_type="content",
            source_platform="manual",
            title="Target",
        )
        upsert_edge(
            from_node=source,
            to_node=target,
            edge_type="semantic",
            source_platform="manual",
            weight_delta=0.4,
        )

        call_command("sync_spore_neo4j")

        self.assertGreaterEqual(upsert_graph_node_mock.call_count, 2)
        self.assertGreaterEqual(upsert_graph_edge_mock.call_count, 1)

