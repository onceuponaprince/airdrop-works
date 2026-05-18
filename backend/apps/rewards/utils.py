"""Utilities for on-chain payout helpers (gas estimation, ABI encoding).

This file provides a minimal RPC-based gas estimate for ERC-20 transfers by
constructing the `transfer(address,uint256)` call data and calling
`eth_estimateGas` on the configured RPC URL.
"""
from __future__ import annotations

import httpx
from django.conf import settings
import logging

logger = logging.getLogger(__name__)


def _pad_hex(hexstr: str, length: int = 64) -> str:
    return hexstr.rjust(length, "0")


def estimate_erc20_transfer_gas(rpc_url: str, token_address: str, to_address: str, amount_wei: int, from_address: str | None = None) -> int | None:
    """Estimate gas for an ERC20 transfer using eth_estimateGas via JSON-RPC.

    Returns estimated gas as int or None on failure.
    """
    # function selector for transfer(address,uint256)
    selector = "a9059cbb"
    to_clean = to_address.lower().replace("0x", "")
    amount_hex = hex(amount_wei)[2:]

    data = "0x" + selector + _pad_hex(to_clean) + _pad_hex(amount_hex)

    payload = {
        "jsonrpc": "2.0",
        "method": "eth_estimateGas",
        "params": [
            {
                "to": token_address,
                "data": data,
            }
        ],
        "id": 1,
    }

    try:
        resp = httpx.post(rpc_url, json=payload, timeout=10)
        resp.raise_for_status()
        data = resp.json()
        result = data.get("result")
        if not result:
            logger.warning("No gas estimate result: %s", data)
            return None
        return int(result, 16)
    except Exception as e:
        logger.exception("Failed to estimate gas via RPC %s: %s", rpc_url, e)
        return None
