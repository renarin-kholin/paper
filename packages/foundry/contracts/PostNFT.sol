// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";

contract PostNFT is ERC721URIStorage, Ownable {
    struct PostConfig {
        address author;
        bool paywalled;
        uint256 paywallPrice;
        uint256 totalEarnings;
    }

    struct AdSpace {
        uint256 pricePerDay;
        string adContentURI;
        address advertiser;
        uint256 expiresAt;
        bool enabled;
    }

    uint256 public constant MIN_DURATION_DAYS = 1;
    uint256 public constant MAX_DURATION_DAYS = 365;

    uint256 private _nextTokenId;

    mapping(uint256 => PostConfig) private posts;
    mapping(uint256 => address) public postAuthors;
    mapping(uint256 => bytes32) public pendingAdCommits;
    mapping(uint256 => mapping(address => bool)) public hasUnlocked;
    mapping(uint256 => AdSpace) private adSpaces;

    event PostMinted(uint256 indexed tokenId, address indexed author, string contentURI, bool paywalled, uint256 paywallPrice);
    event PostUnlocked(uint256 indexed tokenId, address indexed reader, uint256 amountPaid);
    event AdCommitted(uint256 indexed tokenId, bytes32 commitHash);
    event AdSpacePurchased(uint256 indexed tokenId, address indexed advertiser, string adContentURI, uint256 expiresAt);
    event PostConfigured(uint256 indexed tokenId, address indexed author, bool paywalled, uint256 paywallPrice);
    event AdSpaceConfigured(uint256 indexed tokenId, address indexed author, uint256 pricePerDay, bool enabled);

    constructor(address initialOwner) ERC721("Paper Post", "PAPER") Ownable(initialOwner) {}

    function mintPost(
        address author,
        string memory contentURI,
        bool paywalled,
        uint256 paywallPrice,
        uint256 adPricePerDay
    ) external onlyOwner returns (uint256) {
        require(author != address(0), "Invalid author");
        require(bytes(contentURI).length > 0, "Empty content URI");
        require(!paywalled || paywallPrice > 0, "Invalid paywall price");

        uint256 tokenId = _nextTokenId;
        _nextTokenId += 1;

        _safeMint(author, tokenId);
        _setTokenURI(tokenId, contentURI);

        postAuthors[tokenId] = author;
        posts[tokenId] = PostConfig({
            author: author,
            paywalled: paywalled,
            paywallPrice: paywallPrice,
            totalEarnings: 0
        });

        adSpaces[tokenId] = AdSpace({
            pricePerDay: adPricePerDay,
            adContentURI: "",
            advertiser: address(0),
            expiresAt: 0,
            enabled: adPricePerDay > 0
        });

        emit PostMinted(tokenId, author, contentURI, paywalled, paywallPrice);
        return tokenId;
    }

    function recordUnlock(uint256 tokenId, address reader, uint256 amountPaid) external onlyOwner {
        _requirePostExists(tokenId);
        require(reader != address(0), "Invalid reader");
        require(posts[tokenId].paywalled, "Post is not paywalled");
        require(amountPaid >= posts[tokenId].paywallPrice, "Insufficient payment");
        require(!hasUnlocked[tokenId][reader], "Already unlocked");

        hasUnlocked[tokenId][reader] = true;
        posts[tokenId].totalEarnings += amountPaid;

        emit PostUnlocked(tokenId, reader, amountPaid);
    }

    function setAdContent(
        uint256 tokenId,
        address advertiser,
        string memory adContentURI,
        uint256 durationDays
    ) external onlyOwner {
        _requirePostExists(tokenId);
        _validateAdInputs(advertiser, adContentURI, durationDays);

        AdSpace storage ad = adSpaces[tokenId];
        require(ad.enabled, "Ad space disabled");
        require(ad.expiresAt < block.timestamp, "Current ad still active");

        uint256 expiresAt = block.timestamp + durationDays * 1 days;
        ad.adContentURI = adContentURI;
        ad.advertiser = advertiser;
        ad.expiresAt = expiresAt;
        posts[tokenId].totalEarnings += ad.pricePerDay * durationDays;

        emit AdSpacePurchased(tokenId, advertiser, adContentURI, expiresAt);
    }

    function commitAdPurchase(uint256 tokenId, bytes32 commitHash) external onlyOwner {
        _requirePostExists(tokenId);
        require(commitHash != bytes32(0), "Invalid commit hash");

        AdSpace storage ad = adSpaces[tokenId];
        require(ad.enabled, "Ad space disabled");
        require(ad.expiresAt < block.timestamp, "Current ad still active");
        require(pendingAdCommits[tokenId] == bytes32(0), "Commit already exists");

        pendingAdCommits[tokenId] = commitHash;
        emit AdCommitted(tokenId, commitHash);
    }

    function revealAdPurchase(
        uint256 tokenId,
        address advertiser,
        string memory adContentURI,
        uint256 durationDays,
        bytes32 salt
    ) external onlyOwner {
        _requirePostExists(tokenId);
        _validateAdInputs(advertiser, adContentURI, durationDays);

        AdSpace storage ad = adSpaces[tokenId];
        require(ad.enabled, "Ad space disabled");
        require(ad.expiresAt < block.timestamp, "Current ad still active");

        bytes32 expectedCommit = computeCommitHash(tokenId, advertiser, adContentURI, durationDays, salt);
        require(pendingAdCommits[tokenId] == expectedCommit, "Invalid reveal");

        delete pendingAdCommits[tokenId];

        uint256 expiresAt = block.timestamp + durationDays * 1 days;
        ad.adContentURI = adContentURI;
        ad.advertiser = advertiser;
        ad.expiresAt = expiresAt;
        posts[tokenId].totalEarnings += ad.pricePerDay * durationDays;

        emit AdSpacePurchased(tokenId, advertiser, adContentURI, expiresAt);
    }

    function configurePost(
        uint256 tokenId,
        bool paywalled,
        uint256 paywallPrice,
        uint256 adPricePerDay,
        bool adEnabled
    ) public {
        _requirePostExists(tokenId);
        require(postAuthors[tokenId] == msg.sender, "Not the author");
        require(!paywalled || paywallPrice > 0, "Invalid paywall price");
        require(!adEnabled || adPricePerDay > 0, "Invalid ad price");

        posts[tokenId].paywalled = paywalled;
        posts[tokenId].paywallPrice = paywallPrice;

        AdSpace storage ad = adSpaces[tokenId];
        ad.pricePerDay = adPricePerDay;
        ad.enabled = adEnabled;

        emit PostConfigured(tokenId, msg.sender, paywalled, paywallPrice);
        emit AdSpaceConfigured(tokenId, msg.sender, adPricePerDay, adEnabled);
    }

    function configureAdSpace(uint256 tokenId, uint256 pricePerDay, bool enabled) external {
        configurePost(tokenId, posts[tokenId].paywalled, posts[tokenId].paywallPrice, pricePerDay, enabled);
    }

    function isAdActive(uint256 tokenId) external view returns (bool) {
        _requirePostExists(tokenId);

        AdSpace memory ad = adSpaces[tokenId];
        return ad.enabled && ad.expiresAt > block.timestamp && bytes(ad.adContentURI).length > 0;
    }

    function getAdSpace(uint256 tokenId) external view returns (AdSpace memory) {
        _requirePostExists(tokenId);
        return adSpaces[tokenId];
    }

    function getPostConfig(uint256 tokenId) external view returns (PostConfig memory) {
        _requirePostExists(tokenId);
        return posts[tokenId];
    }

    function computeCommitHash(
        uint256 tokenId,
        address advertiser,
        string memory adContentURI,
        uint256 durationDays,
        bytes32 salt
    ) public pure returns (bytes32) {
        return keccak256(abi.encode(tokenId, advertiser, adContentURI, durationDays, salt));
    }

    function _validateAdInputs(address advertiser, string memory adContentURI, uint256 durationDays) private pure {
        require(advertiser != address(0), "Invalid advertiser");
        require(bytes(adContentURI).length > 0, "Empty ad URI");
        require(durationDays >= MIN_DURATION_DAYS && durationDays <= MAX_DURATION_DAYS, "Invalid duration");
    }

    function _requirePostExists(uint256 tokenId) private view {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");
    }
}
