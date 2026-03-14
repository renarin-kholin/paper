// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/// @title AdCampaigns - Advertising Campaign Management for Paper Articles
/// @notice Manages advertising campaigns on articles with upfront payment model
contract AdCampaigns {
    /// @notice Campaign details
    struct Campaign {
        address advertiser;
        uint256 articleId;
        string imageCid; // IPFS CID of the ad image
        string linkUrl; // URL the ad links to
        uint256 startTime;
        uint256 endTime;
        uint256 dailyRateWei; // Daily cost in wei
        uint256 totalPaid; // Total amount paid upfront
        bool active;
    }

    /// @notice Minimum campaign duration (1 day)
    uint256 public constant MIN_DURATION_DAYS = 1;
    /// @notice Maximum campaign duration (90 days)
    uint256 public constant MAX_DURATION_DAYS = 90;
    /// @notice Seconds per day
    uint256 public constant SECONDS_PER_DAY = 86400;

    /// @notice Counter for campaign IDs (starts at 1, 0 is reserved as sentinel)
    uint256 public campaignCount;

    /// @notice Maps campaignId to Campaign
    mapping(uint256 => Campaign) public campaigns;

    /// @notice Maps articleId to currently active campaignId (0 = no active campaign)
    mapping(uint256 => uint256) public activeCampaignByArticle;

    /// @notice Maps advertiser to their campaign IDs
    mapping(address => uint256[]) public advertiserCampaigns;

    /// @notice Reference to Paper contract to verify article exists and get author
    address public paperContract;

    /// @notice Emitted when a new campaign is created
    event CampaignCreated(
        uint256 indexed campaignId,
        uint256 indexed articleId,
        address indexed advertiser,
        uint256 durationDays,
        uint256 totalPaid,
        string imageCid,
        string linkUrl
    );

    /// @notice Emitted when a campaign starts
    event CampaignStarted(
        uint256 indexed campaignId,
        uint256 indexed articleId,
        uint256 startTime
    );

    /// @notice Emitted when a campaign ends
    event CampaignEnded(
        uint256 indexed campaignId,
        uint256 indexed articleId,
        uint256 endTime
    );

    /// @notice Initialize with Paper contract address
    constructor(address _paperContract) {
        require(
            _paperContract != address(0),
            "AdCampaigns: invalid Paper contract"
        );
        paperContract = _paperContract;
        // Start campaign IDs at 1 (0 is reserved as sentinel value for "no campaign")
        campaignCount = 1;
    }

    /// @notice Create a new advertising campaign
    /// @param articleId The article to advertise on
    /// @param durationDays Campaign duration in days
    /// @param dailyRateWei Daily advertising rate in wei
    /// @param imageCid IPFS CID of the ad image
    /// @param linkUrl URL the ad should link to
    function createCampaign(
        uint256 articleId,
        uint256 durationDays,
        uint256 dailyRateWei,
        string memory imageCid,
        string memory linkUrl
    ) external payable returns (uint256) {
        require(
            durationDays >= MIN_DURATION_DAYS &&
                durationDays <= MAX_DURATION_DAYS,
            "AdCampaigns: invalid duration"
        );
        require(dailyRateWei > 0, "AdCampaigns: invalid daily rate");
        require(bytes(imageCid).length > 0, "AdCampaigns: empty image CID");
        require(bytes(linkUrl).length > 0, "AdCampaigns: empty link URL");

        uint256 totalCost = dailyRateWei * durationDays;
        require(msg.value >= totalCost, "AdCampaigns: insufficient payment");

        _validateNoActiveCampaign(articleId);
        address author = _getArticleAuthor(articleId);

        uint256 campaignId = campaignCount++;
        uint256 endTime = block.timestamp + (durationDays * SECONDS_PER_DAY);

        campaigns[campaignId] = Campaign({
            advertiser: msg.sender,
            articleId: articleId,
            imageCid: imageCid,
            linkUrl: linkUrl,
            startTime: block.timestamp,
            endTime: endTime,
            dailyRateWei: dailyRateWei,
            totalPaid: totalCost,
            active: true
        });

        activeCampaignByArticle[articleId] = campaignId;
        advertiserCampaigns[msg.sender].push(campaignId);

        (bool sent, ) = payable(author).call{value: totalCost}("");
        require(sent, "AdCampaigns: payment transfer failed");

        if (msg.value > totalCost) {
            (bool refunded, ) = payable(msg.sender).call{
                value: msg.value - totalCost
            }("");
            require(refunded, "AdCampaigns: refund failed");
        }

        emit CampaignCreated(
            campaignId,
            articleId,
            msg.sender,
            durationDays,
            totalCost,
            imageCid,
            linkUrl
        );
        emit CampaignStarted(campaignId, articleId, block.timestamp);

        return campaignId;
    }

    /// @notice Internal function to validate no active campaign exists
    function _validateNoActiveCampaign(uint256 articleId) internal view {
        uint256 existingCampaignId = activeCampaignByArticle[articleId];
        if (existingCampaignId != 0) {
            require(
                block.timestamp >= campaigns[existingCampaignId].endTime,
                "AdCampaigns: article already has active campaign"
            );
        }
    }

    /// @notice Internal function to get article author
    function _getArticleAuthor(
        uint256 articleId
    ) internal view returns (address) {
        (bool success, bytes memory data) = paperContract.staticcall(
            abi.encodeWithSignature("articleMeta(uint256)", articleId)
        );
        require(success, "AdCampaigns: failed to get article info");

        address author;
        assembly {
            author := mload(add(data, 32))
        }
        require(author != address(0), "AdCampaigns: article does not exist");
        return author;
    }

    /// @notice Get active campaign for an article
    /// @param articleId The article ID
    /// @return Campaign details (returns empty campaign if none active)
    function getActiveCampaign(
        uint256 articleId
    ) external view returns (Campaign memory) {
        uint256 campaignId = activeCampaignByArticle[articleId];
        if (campaignId == 0) {
            return
                Campaign({
                    advertiser: address(0),
                    articleId: 0,
                    imageCid: "",
                    linkUrl: "",
                    startTime: 0,
                    endTime: 0,
                    dailyRateWei: 0,
                    totalPaid: 0,
                    active: false
                });
        }

        Campaign memory campaign = campaigns[campaignId];

        // Check if campaign has expired
        if (block.timestamp >= campaign.endTime) {
            campaign.active = false;
        }

        return campaign;
    }

    /// @notice Check if an article has an active campaign
    /// @param articleId The article ID
    /// @return True if there's an active campaign
    function hasActiveCampaign(uint256 articleId) external view returns (bool) {
        uint256 campaignId = activeCampaignByArticle[articleId];
        if (campaignId == 0) return false;

        Campaign memory campaign = campaigns[campaignId];
        return campaign.active && block.timestamp < campaign.endTime;
    }

    /// @notice Get all campaigns by an advertiser
    /// @param advertiser The advertiser address
    /// @return Array of campaign IDs
    function getCampaignsByAdvertiser(
        address advertiser
    ) external view returns (uint256[] memory) {
        return advertiserCampaigns[advertiser];
    }

    /// @notice Get campaign details by ID
    /// @param campaignId The campaign ID
    /// @return Campaign details
    function getCampaign(
        uint256 campaignId
    ) external view returns (Campaign memory) {
        require(
            campaignId < campaignCount,
            "AdCampaigns: campaign does not exist"
        );
        Campaign memory campaign = campaigns[campaignId];

        // Update active status based on current time
        if (block.timestamp >= campaign.endTime) {
            campaign.active = false;
        }

        return campaign;
    }

    /// @notice Get daily rate for advertising on an article (from article metadata)
    /// @param articleId The article ID
    /// @return Daily rate in wei (0 if no ad space available)
    function getArticleDailyRate(
        uint256 articleId
    ) external view returns (uint256) {
        // This would need to read from article metadata stored in IPFS
        // For now, we'll let the frontend determine this from the article's adSpace config
        // The contract just validates that payment matches what the advertiser claims
        return 0;
    }

    /// @notice Calculate campaign cost
    /// @param dailyRateWei Daily rate in wei
    /// @param durationDays Duration in days
    /// @return Total cost in wei
    function calculateCampaignCost(
        uint256 dailyRateWei,
        uint256 durationDays
    ) external pure returns (uint256) {
        require(
            durationDays >= MIN_DURATION_DAYS,
            "AdCampaigns: duration too short"
        );
        require(
            durationDays <= MAX_DURATION_DAYS,
            "AdCampaigns: duration too long"
        );
        return dailyRateWei * durationDays;
    }
}
