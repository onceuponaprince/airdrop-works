"""Web3 helpers for payout batching and safe ERC-20 transfer planning."""
from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal
from typing import Any

from django.conf import settings
from web3 import HTTPProvider, Web3

from apps.ai_core.metrics import record_payout_gas_estimate, record_payout_send


ERC20_ABI: list[dict[str, Any]] = [
    {
        "constant": True,
        "inputs": [],
        "name": "decimals",
        "outputs": [{"name": "", "type": "uint8"}],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "constant": True,
        "inputs": [],
        "name": "symbol",
        "outputs": [{"name": "", "type": "string"}],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "constant": True,
        "inputs": [],
        "name": "name",
        "outputs": [{"name": "", "type": "string"}],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "constant": False,
        "inputs": [
            {"name": "to", "type": "address"},
            {"name": "value", "type": "uint256"},
        ],
        "name": "transfer",
        "outputs": [{"name": "", "type": "bool"}],
        "stateMutability": "nonpayable",
        "type": "function",
    },
]


@dataclass(frozen=True)
class TokenInfo:
    address: str
    symbol: str
    name: str
    decimals: int


def get_web3(rpc_url: str | None = None) -> Web3:
    return Web3(HTTPProvider(rpc_url or settings.WEB3_RPC_URL))


def get_token_contract(rpc_url: str, token_address: str):
    web3 = get_web3(rpc_url)
    checksum = web3.to_checksum_address(token_address)
    return web3.eth.contract(address=checksum, abi=ERC20_ABI)


def get_token_info(rpc_url: str, token_address: str) -> TokenInfo:
    contract = get_token_contract(rpc_url, token_address)
    return TokenInfo(
        address=token_address,
        symbol=str(contract.functions.symbol().call()),
        name=str(contract.functions.name().call()),
        decimals=int(contract.functions.decimals().call()),
    )


def amount_to_wei(amount: str | Decimal | float, decimals: int) -> int:
    return int(Decimal(str(amount)) * (Decimal(10) ** decimals))


def estimate_erc20_transfer_gas(
    rpc_url: str,
    token_address: str,
    to_address: str,
    amount_wei: int,
    from_address: str | None = None,
) -> int | None:
    web3 = get_web3(rpc_url)
    contract = web3.eth.contract(address=web3.to_checksum_address(token_address), abi=ERC20_ABI)
    tx_params: dict[str, Any] = {"to": contract.address}
    if from_address:
        tx_params["from"] = web3.to_checksum_address(from_address)
    try:
        estimate = contract.functions.transfer(web3.to_checksum_address(to_address), int(amount_wei)).estimate_gas(tx_params)
        record_payout_gas_estimate(token=token_address, chain=str(getattr(settings, "PAYOUT_CHAIN", "unknown")), success=True)
        return int(estimate)
    except Exception:
        record_payout_gas_estimate(token=token_address, chain=str(getattr(settings, "PAYOUT_CHAIN", "unknown")), success=False)
        return None


def build_erc20_transfer_tx(
    rpc_url: str,
    token_address: str,
    to_address: str,
    amount_wei: int,
    from_address: str,
    gas_limit: int | None = None,
) -> dict[str, Any]:
    web3 = get_web3(rpc_url)
    contract = web3.eth.contract(address=web3.to_checksum_address(token_address), abi=ERC20_ABI)
    sender = web3.to_checksum_address(from_address)
    recipient = web3.to_checksum_address(to_address)
    tx = contract.functions.transfer(recipient, int(amount_wei)).build_transaction(
        {
            "from": sender,
            "nonce": web3.eth.get_transaction_count(sender),
            "chainId": web3.eth.chain_id,
        }
    )
    if gas_limit is not None:
        tx["gas"] = gas_limit
    return tx


def send_erc20_transfer(
    rpc_url: str,
    private_key: str,
    token_address: str,
    to_address: str,
    amount_wei: int,
    gas_limit: int | None = None,
) -> str:
    web3 = get_web3(rpc_url)
    account = web3.eth.account.from_key(private_key)
    tx = build_erc20_transfer_tx(
        rpc_url=rpc_url,
        token_address=token_address,
        to_address=to_address,
        amount_wei=amount_wei,
        from_address=account.address,
        gas_limit=gas_limit,
    )
    if "gas" not in tx:
        tx["gas"] = estimate_erc20_transfer_gas(rpc_url, token_address, to_address, amount_wei, account.address) or 0
    if "gasPrice" not in tx and "maxFeePerGas" not in tx:
        tx["gasPrice"] = web3.eth.gas_price
    signed = account.sign_transaction(tx)
    tx_hash = web3.eth.send_raw_transaction(signed.rawTransaction)
    record_payout_send(token=token_address, chain=str(getattr(settings, "PAYOUT_CHAIN", "unknown")), success=True)
    return tx_hash.hex()
