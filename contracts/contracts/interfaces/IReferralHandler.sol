// SPDX-License-Identifier: GNU AGPLv3
pragma solidity 0.8.24;

interface IReferralHandler {
    function getTier() external view returns (uint8);
}
