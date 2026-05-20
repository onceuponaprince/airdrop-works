from io import StringIO
from types import SimpleNamespace

from django.core.management import call_command
from django.test import override_settings


class _FakeSigner:
    def __init__(self):
        self.calls: list[tuple[str, str, int]] = []

    def send_erc20(self, token_address: str, to_address: str, amount_wei: int) -> str:
        self.calls.append((token_address, to_address, amount_wei))
        return "0xdeadbeef"


def _patch_command_dependencies(monkeypatch, fake_signer):
    monkeypatch.setattr(
        "apps.rewards.management.commands.payout_batch.get_configured_signer_service",
        lambda: fake_signer,
    )
    monkeypatch.setattr(
        "apps.rewards.management.commands.payout_batch.get_token_info",
        lambda rpc_url, token_address: SimpleNamespace(symbol="AIRDROP", name="Airdrop Token", decimals=18),
    )
    monkeypatch.setattr(
        "apps.rewards.management.commands.payout_batch.estimate_erc20_transfer_gas",
        lambda **kwargs: 55000,
    )
    monkeypatch.setattr(
        "apps.rewards.management.commands.payout_batch.Command._load_payouts",
        lambda self: [
            {
                "recipient": "0x000000000000000000000000000000000000dEaD",
                "amount": "10.0",
                "token_symbol": "AIRDROP",
                "token_address": "0x0000000000000000000000000000000000000001",
                "chain": "avalanche",
            },
        ],
    )


@override_settings(WEB3_RPC_URL="http://rpc", PAYOUT_CHAIN="avalanche", PAYOUT_SIGNER_PRIVATE_KEY="0xabc")
def test_payout_batch_dry_run_reports_plan_without_sending(monkeypatch):
    fake_signer = _FakeSigner()
    _patch_command_dependencies(monkeypatch, fake_signer)

    stdout = StringIO()
    call_command("payout_batch", dry_run=True, approve=False, stdout=stdout)

    output = stdout.getvalue()
    assert "Prepared 1 payouts" in output
    assert "DRY: would send 10.0 AIRDROP" in output
    assert fake_signer.calls == []


@override_settings(WEB3_RPC_URL="http://rpc", PAYOUT_CHAIN="avalanche", PAYOUT_SIGNER_PRIVATE_KEY="0xabc")
def test_payout_batch_requires_approval_before_sending(monkeypatch):
    fake_signer = _FakeSigner()
    _patch_command_dependencies(monkeypatch, fake_signer)

    stdout = StringIO()
    call_command("payout_batch", dry_run=False, approve=False, stdout=stdout)

    output = stdout.getvalue()
    assert "No --approve flag provided" in output
    assert fake_signer.calls == []


@override_settings(WEB3_RPC_URL="http://rpc", PAYOUT_CHAIN="avalanche", PAYOUT_SIGNER_PRIVATE_KEY="0xabc")
def test_payout_batch_execute_with_approval_sends_transaction(monkeypatch):
    fake_signer = _FakeSigner()
    _patch_command_dependencies(monkeypatch, fake_signer)

    stdout = StringIO()
    call_command("payout_batch", dry_run=False, approve=True, stdout=stdout)

    output = stdout.getvalue()
    assert "Sent payout transaction: 0xdeadbeef" in output
    assert fake_signer.calls == [("0x0000000000000000000000000000000000000001", "0x000000000000000000000000000000000000dEaD", 10_000000000000000000)]
