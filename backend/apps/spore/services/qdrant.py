"""Lightweight Qdrant REST client."""

from __future__ import annotations

import json
import logging
import uuid
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from django.conf import settings

logger = logging.getLogger(__name__)


class QdrantVectorClient:
    def __init__(self) -> None:
        self.base_url = settings.SPORE_QDRANT_URL.rstrip("/")
        self.collection = settings.SPORE_QDRANT_COLLECTION
        self.timeout = settings.SPORE_QDRANT_TIMEOUT_SECONDS
        self.enabled = bool(getattr(settings, "SPORE_QDRANT_ENABLED", False))

    def _request(self, method: str, path: str, body: dict[str, Any] | None = None) -> dict[str, Any]:
        url = f"{self.base_url}{path}"
        payload = None
        headers = {"Content-Type": "application/json"}
        if body is not None:
            payload = json.dumps(body).encode("utf-8")
        request = Request(url=url, headers=headers, data=payload, method=method)
        try:
            with urlopen(request, timeout=self.timeout) as response:
                raw = response.read().decode("utf-8")
                return json.loads(raw) if raw else {}
        except HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="ignore")
            logger.warning("[SPORE/Qdrant] HTTP %s %s: %s", exc.code, url, detail)
            raise ValueError(f"Qdrant request failed: {exc.code}") from exc
        except URLError as exc:
            logger.warning("[SPORE/Qdrant] Network error %s: %s", url, exc)
            raise ValueError("Qdrant unavailable") from exc

    def ensure_collection(self, vector_size: int) -> None:
        if not self.enabled:
            return
        payload = {"vectors": {"size": vector_size, "distance": "Cosine"}}
        self._request("PUT", f"/collections/{self.collection}", payload)

    def upsert(self, point_id: str, vector: list[float], payload: dict[str, Any]) -> None:
        if not self.enabled:
            return
        body = {
            "points": [
                {
                    "id": point_id,
                    "vector": vector,
                    "payload": payload,
                }
            ]
        }
        self._request("PUT", f"/collections/{self.collection}/points", body)

    def upsert_text_node(self, node_key: str, vector: list[float], payload: dict[str, Any]) -> str:
        point_id = str(uuid.uuid5(uuid.NAMESPACE_URL, node_key))
        self.upsert(point_id=point_id, vector=vector, payload=payload)
        return point_id

    def search(self, vector: list[float], limit: int = 10) -> list[dict[str, Any]]:
        if not self.enabled:
            return []
        body = {"vector": vector, "limit": limit, "with_payload": True}
        response = self._request("POST", f"/collections/{self.collection}/points/search", body)
        return response.get("result", [])

