// SPDX-License-Identifier: GNU AGPLv3
pragma solidity 0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title AI(r)Drop Campaign Escrow
 * @notice Holds reward pools for AI(r)Drop campaigns (quests)
 * @dev Adapted from TG EscrowTokenFacet. Simplified — no tax system for v1.
 *      Projects deposit tokens. Platform distributes based on AI Judge scores.
 *      One escrow instance per campaign.
 */
contract CampaignEscrow is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    enum CampaignStatus { Active, Completed, Cancelled }

    struct Campaign {
        address token;           // reward token address
        uint256 totalPool;       // total deposited by project
        uint256 distributed;     // amount already sent to contributors
        uint256 startTime;
        uint256 endTime;
        address project;         // project that funded this campaign
        CampaignStatus status;
    }

    mapping(uint256 => Campaign) public campaigns;
    uint256 public campaignCount;

    // Platform treasury for future fee collection
    address public treasury;

    event CampaignCreated(uint256 indexed campaignId, address indexed project, address token, uint256 amount, uint256 endTime);
    event RewardDistributed(uint256 indexed campaignId, address indexed contributor, uint256 amount);
    event CampaignCompleted(uint256 indexed campaignId, uint256 totalDistributed);
    event CampaignCancelled(uint256 indexed campaignId, uint256 refunded);
    event TreasuryUpdated(address indexed oldTreasury, address indexed newTreasury);

    constructor(address _owner, address _treasury) Ownable(_owner) {
        treasury = _treasury;
    }

    /// @notice Project creates a campaign by depositing reward tokens
    /// @param _token ERC20 token address for rewards
    /// @param _amount Total reward pool
    /// @param _duration Campaign duration in seconds
    function createCampaign(
        address _token,
        uint256 _amount,
        uint256 _duration
    ) external nonReentrant returns (uint256 campaignId) {
        require(_token != address(0), "Invalid token");
        require(_amount > 0, "Amount must be > 0");
        require(_duration > 0, "Duration must be > 0");

        // Transfer tokens from project to escrow
        IERC20(_token).safeTransferFrom(msg.sender, address(this), _amount);

        campaignId = campaignCount++;
        campaigns[campaignId] = Campaign({
            token: _token,
            totalPool: _amount,
            distributed: 0,
            startTime: block.timestamp,
            endTime: block.timestamp + _duration,
            project: msg.sender,
            status: CampaignStatus.Active
        });

        emit CampaignCreated(campaignId, msg.sender, _token, _amount, block.timestamp + _duration);
    }

    /// @notice Platform distributes rewards to a contributor based on AI Judge score
    /// @dev Called by platform backend (owner) after AI Judge scores contributions
    /// @param _campaignId Campaign to distribute from
    /// @param _contributor Address to receive rewards
    /// @param _amount Amount of reward tokens
    function distributeReward(
        uint256 _campaignId,
        address _contributor,
        uint256 _amount
    ) external onlyOwner nonReentrant {
        Campaign storage campaign = campaigns[_campaignId];
        require(campaign.status == CampaignStatus.Active, "Campaign not active");
        require(campaign.distributed + _amount <= campaign.totalPool, "Exceeds pool");
        require(_contributor != address(0), "Invalid contributor");

        campaign.distributed += _amount;
        IERC20(campaign.token).safeTransfer(_contributor, _amount);

        emit RewardDistributed(_campaignId, _contributor, _amount);
    }

    /// @notice Batch distribute to multiple contributors (gas efficient)
    /// @param _campaignId Campaign to distribute from
    /// @param _contributors Array of contributor addresses
    /// @param _amounts Array of reward amounts (must match contributors length)
    function batchDistribute(
        uint256 _campaignId,
        address[] calldata _contributors,
        uint256[] calldata _amounts
    ) external onlyOwner nonReentrant {
        require(_contributors.length == _amounts.length, "Length mismatch");
        Campaign storage campaign = campaigns[_campaignId];
        require(campaign.status == CampaignStatus.Active, "Campaign not active");

        uint256 totalAmount;
        for (uint256 i; i < _amounts.length; i++) {
            totalAmount += _amounts[i];
        }
        require(campaign.distributed + totalAmount <= campaign.totalPool, "Exceeds pool");

        campaign.distributed += totalAmount;
        for (uint256 i; i < _contributors.length; i++) {
            if (_contributors[i] != address(0) && _amounts[i] > 0) {
                IERC20(campaign.token).safeTransfer(_contributors[i], _amounts[i]);
                emit RewardDistributed(_campaignId, _contributors[i], _amounts[i]);
            }
        }
    }

    /// @notice Mark campaign as completed. Remaining tokens returned to project.
    function completeCampaign(uint256 _campaignId) external onlyOwner {
        Campaign storage campaign = campaigns[_campaignId];
        require(campaign.status == CampaignStatus.Active, "Not active");

        campaign.status = CampaignStatus.Completed;
        uint256 remaining = campaign.totalPool - campaign.distributed;
        if (remaining > 0) {
            IERC20(campaign.token).safeTransfer(campaign.project, remaining);
        }

        emit CampaignCompleted(_campaignId, campaign.distributed);
    }

    /// @notice Cancel campaign and refund project (emergency only)
    function cancelCampaign(uint256 _campaignId) external {
        Campaign storage campaign = campaigns[_campaignId];
        require(campaign.status == CampaignStatus.Active, "Not active");
        require(msg.sender == campaign.project || msg.sender == owner(), "Not authorized");

        campaign.status = CampaignStatus.Cancelled;
        uint256 remaining = campaign.totalPool - campaign.distributed;
        if (remaining > 0) {
            IERC20(campaign.token).safeTransfer(campaign.project, remaining);
        }

        emit CampaignCancelled(_campaignId, remaining);
    }

    /// @notice Get remaining rewards in a campaign
    function getRemainingRewards(uint256 _campaignId) external view returns (uint256) {
        Campaign storage campaign = campaigns[_campaignId];
        return campaign.totalPool - campaign.distributed;
    }

    /// @notice Update treasury address (for future fee collection)
    function setTreasury(address _treasury) external onlyOwner {
        emit TreasuryUpdated(treasury, _treasury);
        treasury = _treasury;
    }
}
