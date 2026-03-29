// SPDX-License-Identifier: GNU AGPLv3
pragma solidity 0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title AI(r)Drop Reward Distributor
 * @notice Distributes InnovatorTokens and triggers badge NFT minting
 * @dev Adapted from TG DiamondLootDistributors / Rewarder.
 *      Simplified for v1 — no referral system, no tax.
 *      Platform backend calls distribute() after AI Judge scoring.
 */
contract RewardDistributor is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    IERC20 public innovatorToken;
    address public profileNFT;

    // Contribution score → reward mapping
    // Score ranges: 0-25 = nothing, 26-50 = small, 51-75 = medium, 76-100 = large
    uint256 public smallReward = 5 ether;      // 5 INOV
    uint256 public mediumReward = 15 ether;     // 15 INOV
    uint256 public largeReward = 50 ether;      // 50 INOV

    // Track total distributed per user
    mapping(address => uint256) public totalDistributed;
    mapping(address => uint256) public contributionCount;

    // Events for subgraph indexing
    event RewardDistributed(
        address indexed contributor,
        uint256 score,
        uint256 amount,
        string contributionId  // off-chain contribution UUID from Django
    );
    event BatchRewardsDistributed(uint256 count, uint256 totalAmount);
    event RewardTiersUpdated(uint256 small, uint256 medium, uint256 large);

    constructor(
        address _owner,
        address _innovatorToken,
        address _profileNFT
    ) Ownable(_owner) {
        innovatorToken = IERC20(_innovatorToken);
        profileNFT = _profileNFT;
    }

    /// @notice Distribute reward to a contributor based on their AI Judge score
    /// @param _contributor Wallet address
    /// @param _score AI Judge composite score (0-100)
    /// @param _contributionId UUID from Django backend for cross-referencing
    function distribute(
        address _contributor,
        uint256 _score,
        string calldata _contributionId
    ) external onlyOwner nonReentrant {
        require(_contributor != address(0), "Invalid address");
        require(_score <= 100, "Score out of range");

        uint256 reward = _calculateReward(_score);
        if (reward == 0) return;

        require(
            innovatorToken.balanceOf(address(this)) >= reward,
            "Insufficient INOV balance"
        );

        innovatorToken.safeTransfer(_contributor, reward);
        totalDistributed[_contributor] += reward;
        contributionCount[_contributor]++;

        emit RewardDistributed(_contributor, _score, reward, _contributionId);
    }

    /// @notice Batch distribute rewards (called after bulk AI Judge scoring)
    /// @param _contributors Array of contributor addresses
    /// @param _scores Array of AI Judge scores
    /// @param _contributionIds Array of contribution UUIDs
    function batchDistribute(
        address[] calldata _contributors,
        uint256[] calldata _scores,
        string[] calldata _contributionIds
    ) external onlyOwner nonReentrant {
        require(
            _contributors.length == _scores.length &&
            _scores.length == _contributionIds.length,
            "Length mismatch"
        );

        uint256 totalAmount;
        uint256 count;

        for (uint256 i; i < _contributors.length; i++) {
            if (_contributors[i] == address(0) || _scores[i] > 100) continue;

            uint256 reward = _calculateReward(_scores[i]);
            if (reward == 0) continue;

            innovatorToken.safeTransfer(_contributors[i], reward);
            totalDistributed[_contributors[i]] += reward;
            contributionCount[_contributors[i]]++;
            totalAmount += reward;
            count++;

            emit RewardDistributed(_contributors[i], _scores[i], reward, _contributionIds[i]);
        }

        emit BatchRewardsDistributed(count, totalAmount);
    }

    /// @notice Calculate reward amount based on AI Judge score
    function _calculateReward(uint256 _score) internal view returns (uint256) {
        if (_score <= 25) return 0;           // Too low / farming detected
        if (_score <= 50) return smallReward;  // Marginal contribution
        if (_score <= 75) return mediumReward; // Solid contribution
        return largeReward;                    // Exceptional contribution
    }

    /// @notice Update reward tier amounts
    function setRewardTiers(
        uint256 _small,
        uint256 _medium,
        uint256 _large
    ) external onlyOwner {
        smallReward = _small;
        mediumReward = _medium;
        largeReward = _large;
        emit RewardTiersUpdated(_small, _medium, _large);
    }

    /// @notice Update InnovatorToken address
    function setInnovatorToken(address _token) external onlyOwner {
        innovatorToken = IERC20(_token);
    }

    /// @notice Update ProfileNFT address
    function setProfileNFT(address _nft) external onlyOwner {
        profileNFT = _nft;
    }

    /// @notice Get contributor stats
    function getContributorStats(address _contributor)
        external
        view
        returns (uint256 totalRewards, uint256 contributions)
    {
        return (totalDistributed[_contributor], contributionCount[_contributor]);
    }

    /// @notice Withdraw stuck tokens (emergency)
    function emergencyWithdraw(address _token, uint256 _amount) external onlyOwner {
        IERC20(_token).safeTransfer(owner(), _amount);
    }
}
