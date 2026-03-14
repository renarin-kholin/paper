// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";

/// @title Paper - Decentralized Publishing Platform
/// @notice Each article is an ERC721 NFT with optional paid content
contract Paper is ERC721URIStorage {
    /// @notice Metadata for each article
    struct ArticleMeta {
        address author;
        uint256 createdAt;
        string title;
        uint256 price; // Price in wei (0 = free)
        address priceToken; // address(0) = ETH, USDC address = USDC
    }

    /// @notice Total number of articles published
    uint256 public articleCount;

    /// @notice Maps tokenId (articleId) to article metadata
    mapping(uint256 => ArticleMeta) public articleMeta;

    /// @notice USDC token address on Base Sepolia
    address public usdcToken;

    /// @notice Minimum price in wei (0.0001 ETH = 100000000000000 wei)
    uint256 public constant MIN_ETH_PRICE = 0.0001 ether;
    /// @notice Minimum USDC price (0.01 USDC = 10000 in 6 decimals)
    uint256 public constant MIN_USDC_PRICE = 10000;

    /// @notice Track who has paid for each article
    mapping(uint256 => mapping(address => bool)) public hasPaid;

    /// @notice Maps user address to their IPFS profile CID
    mapping(address => string) public userProfileCIDs;

    /// @notice USDC interface for transfers
    IERC20 public usdc;

    /// @notice Emitted when a new article is published
    event ArticlePublished(
        uint256 indexed tokenId, address indexed author, string cid, uint256 price, address priceToken
    );

    /// @notice Emitted when article price is updated
    event ArticlePriceUpdated(uint256 indexed tokenId, uint256 price, address priceToken);

    /// @notice Emitted when payment is made
    event PaymentReceived(uint256 indexed tokenId, address payer, uint256 amount);

    /// @notice Emitted when user profile is updated
    event UserProfileUpdated(address indexed user, string cid);

    /// @notice Initialize the contract with ERC721 token details
    constructor() ERC721("Paper Article", "PAPER") {
        usdcToken = 0x0000000000000000000000000000000000001234;
        usdc = IERC20(usdcToken);
    }

    /// @notice Publish a new article as an NFT
    function publish(string memory cid, string memory title, uint256 price, address priceToken) external {
        require(bytes(cid).length > 0, "Paper: empty CID");
        require(bytes(title).length > 0, "Paper: empty title");

        if (priceToken == address(0) && price > 0) {
            require(price >= MIN_ETH_PRICE, "Paper: ETH price too low");
        }

        uint256 tokenId = articleCount;
        articleCount++;

        _mint(msg.sender, tokenId);
        _setTokenURI(tokenId, cid);

        articleMeta[tokenId] = ArticleMeta({
            author: msg.sender, createdAt: block.timestamp, title: title, price: price, priceToken: priceToken
        });

        emit ArticlePublished(tokenId, msg.sender, cid, price, priceToken);
    }

    /// @notice Set or update article price
    function setArticlePrice(uint256 tokenId, uint256 price, address priceToken) external {
        require(tokenId < articleCount, "Paper: article does not exist");
        require(articleMeta[tokenId].author == msg.sender, "Paper: not the author");

        if (priceToken == address(0) && price > 0) {
            require(price >= MIN_ETH_PRICE, "Paper: ETH price too low");
        }

        articleMeta[tokenId].price = price;
        articleMeta[tokenId].priceToken = priceToken;

        emit ArticlePriceUpdated(tokenId, price, priceToken);
    }

    /// @notice Get the article metadata for a specific token
    function getArticleMeta(uint256 tokenId) external view returns (ArticleMeta memory) {
        require(tokenId < articleCount, "Paper: article does not exist");
        return articleMeta[tokenId];
    }

    /// @notice Get the IPFS CID for a specific article
    function getArticleCID(uint256 tokenId) external view returns (string memory) {
        require(tokenId < articleCount, "Paper: article does not exist");
        return tokenURI(tokenId);
    }

    /// @notice Get article price info
    function getArticlePrice(uint256 tokenId) external view returns (uint256 price, address priceToken) {
        require(tokenId < articleCount, "Paper: article does not exist");
        ArticleMeta memory meta = articleMeta[tokenId];
        return (meta.price, meta.priceToken);
    }

    /// @notice Pay for article with ETH or USDC
    function payArticle(uint256 tokenId) external payable {
        require(tokenId < articleCount, "Paper: article does not exist");
        ArticleMeta memory meta = articleMeta[tokenId];
        require(meta.price > 0, "Paper: article is free");

        if (meta.priceToken == address(0)) {
            require(msg.value >= meta.price, "Paper: insufficient ETH");
            hasPaid[tokenId][msg.sender] = true;
            (bool success,) = payable(meta.author).call{ value: msg.value }("");
            require(success, "Paper: ETH transfer failed");
        } else {
            require(msg.value == 0, "Paper: no ETH needed for USDC");
            require(meta.priceToken == usdcToken, "Paper: unsupported token");
            usdc.transferFrom(msg.sender, meta.author, meta.price);
            hasPaid[tokenId][msg.sender] = true;
        }

        emit PaymentReceived(tokenId, msg.sender, meta.price);
    }

    /// @notice Check if address has paid for article
    function hasPaidForArticle(uint256 tokenId, address user) external view returns (bool) {
        return hasPaid[tokenId][user];
    }

    /// @notice Set or update user profile
    function setUserProfile(string memory cid) external {
        require(bytes(cid).length > 0, "Paper: empty CID");
        userProfileCIDs[msg.sender] = cid;
        emit UserProfileUpdated(msg.sender, cid);
    }

    /// @notice Get user profile CID
    function getUserProfileCID(address user) external view returns (string memory) {
        return userProfileCIDs[user];
    }

    /// @notice Get all article IDs by author
    function getArticlesByAuthor(address author) external view returns (uint256[] memory) {
        uint256 total = articleCount;
        uint256[] memory result = new uint256[](total);
        uint256 count = 0;

        for (uint256 i = 0; i < total; i++) {
            if (articleMeta[i].author == author) {
                result[count] = i;
                count++;
            }
        }

        uint256[] memory finalResult = new uint256[](count);
        for (uint256 i = 0; i < count; i++) {
            finalResult[i] = result[i];
        }
        return finalResult;
    }
}

/// @notice Interface for ERC20 tokens
interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}
