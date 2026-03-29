"""Embedding service with deterministic fallback for local/dev."""

from __future__ import annotations

import hashlib
import math


def embed_text(text: str, dims: int = 64) -> list[float]:
    """
    Deterministic embedding used for MVP development and tests.
    Produces stable vectors without external model dependencies.
    """
    clean = text.strip().lower()
    if not clean:
        return [0.0] * dims

    digest = hashlib.sha256(clean.encode("utf-8")).digest()
    values: list[float] = []
    for idx in range(dims):
        byte_value = digest[idx % len(digest)]
        centered = (byte_value / 255.0) * 2.0 - 1.0
        values.append(centered)

    # Normalize so cosine similarity is meaningful.
    norm = math.sqrt(sum(value * value for value in values)) or 1.0
    return [value / norm for value in values]

