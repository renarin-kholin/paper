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

    /// @notice USDC interface for transfers
    IERC20 public usdc;

    /// @notice Emitted when a new article is published
    /// @param tokenId The unique identifier for the article
    /// @param author The wallet address of the article author
    /// @param cid The IPFS CID where the article content is stored
    /// @param price The price for paid content (0 = free)
    /// @param priceToken The token used for payment
    event ArticlePublished(
        uint256 indexed tokenId, address indexed author, string cid, uint256 price, address priceToken
    );

    /// @notice Emitted when article price is updated
    /// @param tokenId The article identifier
    /// @param price New price in wei
    /// @param priceToken New payment token
    event ArticlePriceUpdated(uint256 indexed tokenId, uint256 price, address priceToken);

    /// @notice Emitted when payment is made
    /// @param tokenId The article identifier
    /// @param payer The address that made the payment
    /// @param amount The amount paid
    event PaymentReceived(uint256 indexed tokenId, address payer, uint256 amount);

    /// @notice Initialize the contract with ERC721 token details
    constructor() ERC721("Paper Article", "PAPER") {
        // USDC on Base Sepolia - fake address for local testing
        usdcToken = 0x0000000000000000000000000000000000001234;
        usdc = IERC20(usdcToken);
    }

    /// @notice Publish a new article as an NFT
    /// @param cid The IPFS content identifier (CID) for the article metadata JSON
    /// @param title The title of the article
    /// @param price The price for paid content (0 = free)
    /// @param priceToken address(0) for ETH, USDC address for USDC
    function publish(string memory cid, string memory title, uint256 price, address priceToken) external {
        require(bytes(cid).length > 0, "Paper: empty CID");
        require(bytes(title).length > 0, "Paper: empty title");

        // Validate minimum price - only enforce for ETH
        if (priceToken == address(0) && price > 0) {
            require(price >= MIN_ETH_PRICE, "Paper: ETH price too low");
        }
        // For other tokens (USDC, etc), allow any price > 0

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
    /// @param tokenId The article identifier
    /// @param price New price in wei
    /// @param priceToken address(0) for ETH, USDC address for USDC
    function setArticlePrice(uint256 tokenId, uint256 price, address priceToken) external {
        require(tokenId < articleCount, "Paper: article does not exist");
        require(articleMeta[tokenId].author == msg.sender, "Paper: not the author");

        // Validate minimum price - only enforce for ETH
        if (priceToken == address(0) && price > 0) {
            require(price >= MIN_ETH_PRICE, "Paper: ETH price too low");
        }

        articleMeta[tokenId].price = price;
        articleMeta[tokenId].priceToken = priceToken;

        emit ArticlePriceUpdated(tokenId, price, priceToken);
    }

    /// @notice Get the article metadata for a specific token
    /// @param tokenId The article identifier
    /// @return ArticleMeta struct
    function getArticleMeta(uint256 tokenId) external view returns (ArticleMeta memory) {
        require(tokenId < articleCount, "Paper: article does not exist");
        return articleMeta[tokenId];
    }

    /// @notice Get the IPFS CID for a specific article
    /// @param tokenId The article identifier
    /// @return The IPFS CID stored as tokenURI
    function getArticleCID(uint256 tokenId) external view returns (string memory) {
        require(tokenId < articleCount, "Paper: article does not exist");
        return tokenURI(tokenId);
    }

    /// @notice Get article price info
    /// @param tokenId The article identifier
    /// @return price Price in wei
    /// @return priceToken Payment token address
    function getArticlePrice(uint256 tokenId) external view returns (uint256 price, address priceToken) {
        require(tokenId < articleCount, "Paper: article does not exist");
        ArticleMeta memory meta = articleMeta[tokenId];
        return (meta.price, meta.priceToken);
    }

    /// @notice Pay for article with ETH or USDC
    /// @param tokenId The article identifier
    function payArticle(uint256 tokenId) external payable {
        require(tokenId < articleCount, "Paper: article does not exist");
        ArticleMeta memory meta = articleMeta[tokenId];
        require(meta.price > 0, "Paper: article is free");

        if (meta.priceToken == address(0)) {
            // ETH payment
            require(msg.value >= meta.price, "Paper: insufficient ETH");
            hasPaid[tokenId][msg.sender] = true;
            (bool success, ) = payable(meta.author).call{value: msg.value}("");
            require(success, "Paper: ETH transfer failed");
        } else {
            // USDC payment
            require(msg.value == 0, "Paper: no ETH needed for USDC");
            require(meta.priceToken == usdcToken, "Paper: unsupported token");
            usdc.transferFrom(msg.sender, meta.author, meta.price);
            hasPaid[tokenId][msg.sender] = true;
        }

        emit PaymentReceived(tokenId, msg.sender, meta.price);
    }

    /// @notice Check if address has paid for article
    /// @param tokenId The article identifier
    /// @param user The address to check
    /// @return true if user has paid
    function hasPaidForArticle(uint256 tokenId, address user) external view returns (bool) {
        return hasPaid[tokenId][user];
    }
}

/// @notice Interface for ERC20 tokens
interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}
