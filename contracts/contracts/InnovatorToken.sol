// SPDX-License-Identifier: GNU AGPLv3
pragma solidity 0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title AI(r)Drop Innovator Token
 * @notice ERC20 reward token for AI(r)Drop contributors
 * @dev Adapted from TG GuildXp. Non-transferrable except from distributor.
 *      Minted by owner (platform), distributed through CampaignEscrow.
 */
contract InnovatorToken is ERC20, Ownable, ERC20Permit {
    address public distributor;

    event DistributorSet(address indexed oldDistributor, address indexed newDistributor);

    constructor(address _owner)
        ERC20("InnovatorToken", "INOV")
        Ownable(_owner)
        ERC20Permit("InnovatorToken")
    {}

    function decimals() public view virtual override returns (uint8) {
        return 18;
    }

    /// @notice Transfers blocked except from distributor
    function transfer(address, uint256) public pure override returns (bool) {
        revert("InnovatorToken: transfers disabled");
    }

    /// @notice Only distributor can transferFrom (reward distribution)
    function transferFrom(
        address from,
        address to,
        uint256 amount
    ) public override returns (bool) {
        require(distributor != address(0), "Distributor not set");
        require(from == distributor, "Only distributor can transfer");
        return super.transferFrom(from, to, amount);
    }

    /// @notice Mint tokens (owner only — platform backend triggers via API)
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    /// @notice Burn tokens (owner only)
    function burn(address from, uint256 amount) external onlyOwner {
        _burn(from, amount);
    }

    /// @notice Set the distributor address (CampaignEscrow or RewardDistributor)
    function setDistributor(address _distributor) external onlyOwner {
        emit DistributorSet(distributor, _distributor);
        distributor = _distributor;
    }
}
