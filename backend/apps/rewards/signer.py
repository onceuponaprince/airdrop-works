"""Configured payout signer service abstraction."""
from __future__ import annotations

from dataclasses import dataclass

from django.conf import settings

from .payouts import send_erc20_transfer


@dataclass(frozen=True)
class PayoutSignerService:
    rpc_url: str
    private_key: str

    def send_erc20(self, token_address: str, to_address: str, amount_wei: int) -> str:
        return send_erc20_transfer(
            rpc_url=self.rpc_url,
            private_key=self.private_key,
            token_address=token_address,
            to_address=to_address,
            amount_wei=amount_wei,
        )


def get_configured_signer_service() -> PayoutSignerService | None:
    if not settings.WEB3_RPC_URL or not settings.PAYOUT_SIGNER_PRIVATE_KEY:
        return None
    return PayoutSignerService(
        rpc_url=settings.WEB3_RPC_URL,
        private_key=settings.PAYOUT_SIGNER_PRIVATE_KEY,
    )
