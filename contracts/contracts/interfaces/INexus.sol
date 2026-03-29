// SPDX-License-Identifier: GNU AGPLv3
pragma solidity 0.8.24;

interface INexus {
    function getGuardian() external view returns (address);
    function getHandler(uint32 tokenID) external view returns (address);
}
