import json
from unittest.mock import patch

from django.test import override_settings

from apps.spore.services.qdrant import QdrantVectorClient


class _FakeResponse:
    def __init__(self, payload: dict):
        self._payload = payload

    def read(self) -> bytes:
        return json.dumps(self._payload).encode("utf-8")

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc, tb):
        return False


@override_settings(
    SPORE_QDRANT_ENABLED=True,
    SPORE_QDRANT_URL="http://qdrant:6333",
    SPORE_QDRANT_COLLECTION="spore_nodes",
    SPORE_QDRANT_TIMEOUT_SECONDS=3,
)
@patch("apps.spore.services.qdrant.urlopen")
def test_qdrant_search_and_upsert(mock_urlopen):
    mock_urlopen.side_effect = [
        _FakeResponse({"result": True, "status": "ok"}),
        _FakeResponse({"result": True, "status": "ok"}),
        _FakeResponse({"result": [{"id": "1", "score": 0.91, "payload": {"node_key": "x"}}], "status": "ok"}),
    ]
    client = QdrantVectorClient()
    client.ensure_collection(vector_size=4)
    client.upsert_text_node(node_key="twitter:content:1", vector=[0.1, 0.2, 0.3, 0.4], payload={"node_key": "x"})
    result = client.search(vector=[0.1, 0.2, 0.3, 0.4], limit=3)
    assert len(result) == 1
    assert result[0]["payload"]["node_key"] == "x"

