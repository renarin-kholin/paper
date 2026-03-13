// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";

/// @title Paper - Decentralized Publishing Platform
/// @notice Each article is an ERC721 NFT with metadata stored on IPFS
contract Paper is ERC721URIStorage {
    /// @notice Metadata for each article
    struct ArticleMeta {
        address author;
        uint256 createdAt;
        string title;
    }

    /// @notice Total number of articles published
    uint256 public articleCount;

    /// @notice Maps tokenId (articleId) to article metadata
    mapping(uint256 => ArticleMeta) public articleMeta;

    /// @notice Emitted when a new article is published
    /// @param tokenId The unique identifier for the article (also tokenId)
    /// @param author The wallet address of the article author
    /// @param cid The IPFS CID where the article content is stored
    event ArticlePublished(uint256 indexed tokenId, address indexed author, string cid);

    /// @notice Initialize the contract with ERC721 token details
    constructor() ERC721("Paper Article", "PAPER") {}

    /// @notice Publish a new article as an NFT
    /// @dev Mints a new ERC721 token with IPFS URI and stores metadata
    /// @param cid The IPFS content identifier (CID) for the article metadata JSON
    /// @param title The title of the article
    function publish(string memory cid, string memory title) external {
        require(bytes(cid).length > 0, "Paper: empty CID");
        require(bytes(title).length > 0, "Paper: empty title");

        uint256 tokenId = articleCount;
        articleCount++;

        _mint(msg.sender, tokenId);
        _setTokenURI(tokenId, cid);

        articleMeta[tokenId] = ArticleMeta({
            author: msg.sender,
            createdAt: block.timestamp,
            title: title
        });

        emit ArticlePublished(tokenId, msg.sender, cid);
    }

    /// @notice Get the article metadata for a specific token
    /// @param tokenId The article identifier
    /// @return ArticleMeta struct containing author, createdAt, and title
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
}
