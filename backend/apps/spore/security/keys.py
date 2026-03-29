"""API key hashing and token helpers."""

from __future__ import annotations

import hashlib
import secrets


def generate_api_key() -> str:
    return f"spore_{secrets.token_urlsafe(32)}"


def key_prefix(raw_key: str) -> str:
    return raw_key[:12]


def hash_api_key(raw_key: str) -> str:
    return hashlib.sha256(raw_key.encode("utf-8")).hexdigest()

