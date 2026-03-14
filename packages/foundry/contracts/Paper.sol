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

    /// @notice Track who follows whom (follower => followed => bool)
    mapping(address => mapping(address => bool)) public following;

    /// @notice Count of followers for each user
    mapping(address => uint256) public followerCount;

    /// @notice Count of users being followed by each user
    mapping(address => uint256) public followingCount;

    /// @notice Track who liked which article (tokenId => user => bool)
    mapping(uint256 => mapping(address => bool)) public likedBy;

    /// @notice Total likes for each article
    mapping(uint256 => uint256) public likeCount;

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

    /// @notice Emitted when user profile is updated
    /// @param user The user address
    /// @param cid The new IPFS profile CID
    event UserProfileUpdated(address indexed user, string cid);

    /// @notice Emitted when a user follows another
    /// @param follower The address that followed
    /// @param followed The address being followed
    event Followed(address indexed follower, address indexed followed);

    /// @notice Emitted when a user unfollows another
    /// @param follower The address that unfollowed
    /// @param followed The address being unfollowed
    event Unfollowed(address indexed follower, address indexed followed);

    /// @notice Emitted when a user likes an article
    /// @param tokenId The article identifier
    /// @param user The address that liked
    event LikeAdded(uint256 indexed tokenId, address indexed user);

    /// @notice Emitted when a user unlikes an article
    /// @param tokenId The article identifier
    /// @param user The address that unliked
    event LikeRemoved(uint256 indexed tokenId, address indexed user);

    /// @notice Emitted when a user tips an author
    /// @param tokenId The article identifier
    /// @param tipper The address that sent the tip
    /// @param author The article author receiving the tip
    /// @param amount The amount of ETH tipped
    event TipReceived(uint256 indexed tokenId, address indexed tipper, address indexed author, uint256 amount);

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
            (bool success,) = payable(meta.author).call{ value: msg.value }("");
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

    /// @notice Set or update user profile
    /// @param cid The IPFS CID for the user profile JSON
    function setUserProfile(string memory cid) external {
        require(bytes(cid).length > 0, "Paper: empty CID");
        userProfileCIDs[msg.sender] = cid;
        emit UserProfileUpdated(msg.sender, cid);
    }

    /// @notice Get user profile CID
    /// @param user The user address
    /// @return The IPFS CID for the user profile
    function getUserProfileCID(address user) external view returns (string memory) {
        return userProfileCIDs[user];
    }

    /// @notice Get all article IDs by author
    /// @param author The author address
    /// @return Array of article token IDs
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

    /// @notice Follow a user
    /// @param user The address to follow
    function follow(address user) external {
        require(user != msg.sender, "Paper: cannot follow self");
        require(user != address(0), "Paper: invalid address");
        require(!following[msg.sender][user], "Paper: already following");

        following[msg.sender][user] = true;
        followingCount[msg.sender]++;
        followerCount[user]++;

        emit Followed(msg.sender, user);
    }

    /// @notice Unfollow a user
    /// @param user The address to unfollow
    function unfollow(address user) external {
        require(following[msg.sender][user], "Paper: not following");

        following[msg.sender][user] = false;
        followingCount[msg.sender]--;
        followerCount[user]--;

        emit Unfollowed(msg.sender, user);
    }

    /// @notice Check if one user follows another
    /// @param follower The potential follower
    /// @param followed The potential followed user
    /// @return true if follower follows followed
    function isFollowing(address follower, address followed) external view returns (bool) {
        return following[follower][followed];
    }

    /// @notice Get list of followers for a user
    /// @param user The user to get followers for
    /// @return Array of follower addresses
    function getFollowers(address user) external view returns (address[] memory) {
        uint256 total = followerCount[user];
        address[] memory result = new address[](total);
        uint256 count = 0;

        for (uint256 i = 0; i < articleCount; i++) {
            address potentialFollower = articleMeta[i].author;
            if (following[potentialFollower][user]) {
                result[count] = potentialFollower;
                count++;
            }
        }

        return result;
    }

    /// @notice Get list of users that a user is following
    /// @param user The user to get following list for
    /// @return Array of addresses being followed
    function getFollowing(address user) external view returns (address[] memory) {
        uint256 total = articleCount;
        address[] memory result = new address[](followingCount[user]);
        uint256 count = 0;

        for (uint256 i = 0; i < total; i++) {
            address potentialFollowed = articleMeta[i].author;
            if (following[user][potentialFollowed]) {
                result[count] = potentialFollowed;
                count++;
            }
        }

        return result;
    }

    /// @notice Like an article
    /// @param tokenId The article identifier
    function likeArticle(uint256 tokenId) external {
        require(tokenId < articleCount, "Paper: article does not exist");
        require(!likedBy[tokenId][msg.sender], "Paper: already liked");

        likedBy[tokenId][msg.sender] = true;
        likeCount[tokenId]++;

        emit LikeAdded(tokenId, msg.sender);
    }

    /// @notice Unlike an article
    /// @param tokenId The article identifier
    function unlikeArticle(uint256 tokenId) external {
        require(tokenId < articleCount, "Paper: article does not exist");
        require(likedBy[tokenId][msg.sender], "Paper: not liked");

        likedBy[tokenId][msg.sender] = false;
        likeCount[tokenId]--;

        emit LikeRemoved(tokenId, msg.sender);
    }

    /// @notice Check if a user has liked an article
    /// @param tokenId The article identifier
    /// @param user The address to check
    /// @return true if user has liked the article
    function hasLiked(uint256 tokenId, address user) external view returns (bool) {
        return likedBy[tokenId][user];
    }

    /// @notice Get the total like count for an article
    /// @param tokenId The article identifier
    /// @return Number of likes
    function getLikeCount(uint256 tokenId) external view returns (uint256) {
        return likeCount[tokenId];
    }

    /// @notice Tip the author of an article
    /// @param tokenId The article identifier
    function tipAuthor(uint256 tokenId) external payable {
        require(tokenId < articleCount, "Paper: article does not exist");
        require(msg.value > 0, "Paper: no ETH sent");

        address author = articleMeta[tokenId].author;
        require(author != msg.sender, "Paper: cannot tip self");

        (bool success,) = payable(author).call{ value: msg.value }("");
        require(success, "Paper: transfer failed");

        emit TipReceived(tokenId, msg.sender, author, msg.value);
    }

    /// @notice Tip a user directly (by their address)
    /// @param user The address to tip
    function tipUser(address user) external payable {
        require(user != address(0), "Paper: invalid address");
        require(user != msg.sender, "Paper: cannot tip self");
        require(msg.value > 0, "Paper: no ETH sent");

        (bool success,) = payable(user).call{ value: msg.value }("");
        require(success, "Paper: transfer failed");

        emit TipReceived(0, msg.sender, user, msg.value);
    }
}

/// @notice Interface for ERC20 tokens
interface IERC20 {
    function transfer(address to, uint256 amount) external returns (bool);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}
