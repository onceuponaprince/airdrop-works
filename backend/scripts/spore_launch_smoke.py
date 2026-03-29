#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import sys
import time
from typing import Any
from urllib import error, parse, request


def _call(
    method: str,
    base_url: str,
    path: str,
    headers: dict[str, str],
    payload: dict[str, Any] | None = None,
) -> tuple[int, dict[str, Any] | list[Any] | str]:
    data = None
    if payload is not None:
        data = json.dumps(payload).encode("utf-8")
    req = request.Request(
        url=f"{base_url.rstrip('/')}{path}",
        method=method,
        data=data,
        headers=headers,
    )
    try:
        with request.urlopen(req, timeout=20) as resp:
            body = resp.read().decode("utf-8")
            if not body:
                return resp.status, ""
            try:
                return resp.status, json.loads(body)
            except json.JSONDecodeError:
                return resp.status, body
    except error.HTTPError as exc:
        body = exc.read().decode("utf-8")
        try:
            parsed = json.loads(body)
        except json.JSONDecodeError:
            parsed = body
        return exc.code, parsed


def _assert_status(name: str, status: int, expected: int):
    if status != expected:
        raise RuntimeError(f"{name} failed: expected {expected}, got {status}")


def main():
    parser = argparse.ArgumentParser(description="SPORE launch smoke test")
    parser.add_argument("--base-url", required=True, help="Example: http://localhost:8000/api/v1")
    parser.add_argument("--tenant-slug", required=True)
    parser.add_argument("--bearer-token", default="")
    parser.add_argument("--api-key", default="")
    parser.add_argument("--timeout-seconds", type=int, default=20)
    args = parser.parse_args()

    if not args.bearer_token and not args.api_key:
        print("ERROR: provide either --bearer-token or --api-key", file=sys.stderr)
        sys.exit(1)

    headers = {
        "Content-Type": "application/json",
        "X-SPORE-TENANT": args.tenant_slug,
    }
    if args.bearer_token:
        headers["Authorization"] = f"Bearer {args.bearer_token}"
    if args.api_key:
        headers["X-SPORE-API-KEY"] = args.api_key

    ext_id = f"launch-smoke-{int(time.time())}"
    summary: list[str] = []

    status, body = _call(
        "POST",
        args.base_url,
        "/spore/ingest/",
        headers,
        {
            "source_platform": "manual",
            "external_id": ext_id,
            "title": "Launch smoke content",
            "text": "SPORE launch smoke test content for retrieval validation.",
            "metadata": {"source": "launch_smoke_script"},
        },
    )
    _assert_status("ingest", status, 201)
    summary.append("ingest: ok")

    status, body = _call(
        "POST",
        args.base_url,
        "/spore/query/",
        headers,
        {
            "query_text": "launch smoke retrieval validation",
            "hops": 2,
            "damping": 0.7,
            "top_k": 5,
        },
    )
    _assert_status("query", status, 200)
    if isinstance(body, dict):
        result_count = len(body.get("results", []))
        if result_count < 1:
            raise RuntimeError("query returned no results")
    summary.append("query: ok")

    q = parse.urlencode({"account_a": "alice", "account_b": "bob", "days": "30"})
    status, _ = _call(
        "GET",
        args.base_url,
        f"/spore/relationships/twitter/?{q}",
        headers,
        None,
    )
    _assert_status("relationship", status, 200)
    summary.append("relationship: ok")

    status, _ = _call("GET", args.base_url, "/spore/ops/summary/", headers, None)
    _assert_status("ops_summary", status, 200)
    summary.append("ops summary: ok")

    status, _ = _call("GET", args.base_url, "/spore/ops/usage-events/?limit=5", headers, None)
    _assert_status("usage_events", status, 200)
    summary.append("usage events: ok")

    status, _ = _call("GET", args.base_url, "/spore/ops/audit-logs/?limit=5", headers, None)
    _assert_status("audit_logs", status, 200)
    summary.append("audit logs: ok")

    print("SPORE launch smoke passed")
    for row in summary:
        print(f"- {row}")


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:  # noqa: BLE001
        print(f"FAILED: {exc}", file=sys.stderr)
        sys.exit(1)
