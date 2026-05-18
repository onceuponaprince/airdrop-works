from types import SimpleNamespace

from django.test import override_settings

from apps.rewards.payouts import amount_to_wei, estimate_erc20_transfer_gas, get_token_info


class _FakeTransferCall:
    def __init__(self, estimate_value: int = 55000):
        self.estimate_value = estimate_value

    def estimate_gas(self, tx_params):
        assert tx_params["from"] == "0x000000000000000000000000000000000000dEaD"
        return self.estimate_value


class _FakeContractFunctions:
    def __init__(self, estimate_value: int = 55000):
        self.estimate_value = estimate_value

    def decimals(self):
        return SimpleNamespace(call=lambda: 18)

    def symbol(self):
        return SimpleNamespace(call=lambda: "AIRDROP")

    def name(self):
        return SimpleNamespace(call=lambda: "Airdrop Token")

    def transfer(self, to_address, amount_wei):
        assert to_address == "0x000000000000000000000000000000000000dEaD"
        assert amount_wei == 10**18
        return _FakeTransferCall(self.estimate_value)


class _FakeContract:
    def __init__(self, estimate_value: int = 55000):
        self.functions = _FakeContractFunctions(estimate_value)
        self.address = "0x0000000000000000000000000000000000000001"


class _FakeEth:
    def __init__(self, estimate_value: int = 55000):
        self.estimate_value = estimate_value
        self.chain_id = 43114

    def contract(self, address, abi):
        return _FakeContract(self.estimate_value)

    def get_transaction_count(self, address):
        return 1

    @property
    def gas_price(self):
        return 1_000_000_000


class _FakeWeb3:
    def __init__(self, estimate_value: int = 55000):
        self.eth = _FakeEth(estimate_value)

    def to_checksum_address(self, address):
        return address


@override_settings(PAYOUT_CHAIN="avalanche")
def test_amount_to_wei_converts_amount_using_decimals():
    assert amount_to_wei("1.5", 18) == 1500000000000000000


def test_get_token_info_reads_symbol_name_and_decimals(monkeypatch):
    monkeypatch.setattr("apps.rewards.payouts.get_web3", lambda rpc_url: _FakeWeb3())
    info = get_token_info("http://rpc", "0x0000000000000000000000000000000000000001")

    assert info.symbol == "AIRDROP"
    assert info.name == "Airdrop Token"
    assert info.decimals == 18


def test_estimate_erc20_transfer_gas_uses_contract_estimate(monkeypatch):
    monkeypatch.setattr("apps.rewards.payouts.get_web3", lambda rpc_url: _FakeWeb3())
    gas = estimate_erc20_transfer_gas(
        "http://rpc",
        "0x0000000000000000000000000000000000000001",
        "0x000000000000000000000000000000000000dEaD",
        10**18,
        "0x000000000000000000000000000000000000dEaD",
    )

    assert gas == 55000
