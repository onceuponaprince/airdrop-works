// SPDX-License-Identifier: GNU AGPLv3
pragma solidity 0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title AI(r)Drop Donation Box
 * @notice Accepts native ETH/AVAX donations with optional messages.
 *         Owner can withdraw collected funds at any time.
 */
contract DonationBox is Ownable {
    event DonationReceived(address indexed donor, uint256 amount, string message);
    event Withdrawn(address indexed to, uint256 amount);

    constructor(address _owner) Ownable(_owner) {}

    receive() external payable {
        emit DonationReceived(msg.sender, msg.value, "");
    }

    function donate(string calldata message) external payable {
        require(msg.value > 0, "DonationBox: zero value");
        emit DonationReceived(msg.sender, msg.value, message);
    }

    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "DonationBox: nothing to withdraw");
        (bool ok, ) = owner().call{value: balance}("");
        require(ok, "DonationBox: transfer failed");
        emit Withdrawn(owner(), balance);
    }

    function balance() external view returns (uint256) {
        return address(this).balance;
    }
}
