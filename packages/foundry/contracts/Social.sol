// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/// @title Social - Social Features for Paper Protocol
/// @notice Handles follows, likes, and tips
contract Social {
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

    /// @notice Emitted when a user follows another
    event Followed(address indexed follower, address indexed followed);

    /// @notice Emitted when a user unfollows another
    event Unfollowed(address indexed follower, address indexed followed);

    /// @notice Emitted when a user likes an article
    event LikeAdded(uint256 indexed tokenId, address indexed user);

    /// @notice Emitted when a user unlikes an article
    event LikeRemoved(uint256 indexed tokenId, address indexed user);

    /// @notice Emitted when a user tips an author
    event TipReceived(address indexed tipper, address indexed author, uint256 amount);

    /// @notice Follow a user
    function follow(address user) external {
        require(user != msg.sender, "Social: cannot follow self");
        require(user != address(0), "Social: invalid address");
        require(!following[msg.sender][user], "Social: already following");

        following[msg.sender][user] = true;
        followingCount[msg.sender]++;
        followerCount[user]++;

        emit Followed(msg.sender, user);
    }

    /// @notice Unfollow a user
    function unfollow(address user) external {
        require(following[msg.sender][user], "Social: not following");

        following[msg.sender][user] = false;
        followingCount[msg.sender]--;
        followerCount[user]--;

        emit Unfollowed(msg.sender, user);
    }

    /// @notice Check if one user follows another
    function isFollowing(address follower, address followed) external view returns (bool) {
        return following[follower][followed];
    }

    /// @notice Like an article
    function likeArticle(uint256 tokenId) external {
        require(!likedBy[tokenId][msg.sender], "Social: already liked");

        likedBy[tokenId][msg.sender] = true;
        likeCount[tokenId]++;

        emit LikeAdded(tokenId, msg.sender);
    }

    /// @notice Unlike an article
    function unlikeArticle(uint256 tokenId) external {
        require(likedBy[tokenId][msg.sender], "Social: not liked");

        likedBy[tokenId][msg.sender] = false;
        likeCount[tokenId]--;

        emit LikeRemoved(tokenId, msg.sender);
    }

    /// @notice Check if a user has liked an article
    function hasLiked(uint256 tokenId, address user) external view returns (bool) {
        return likedBy[tokenId][user];
    }

    /// @notice Get the total like count for an article
    function getLikeCount(uint256 tokenId) external view returns (uint256) {
        return likeCount[tokenId];
    }

    /// @notice Tip an author directly
    function tipAuthor(address author) external payable {
        require(author != address(0), "Social: invalid address");
        require(author != msg.sender, "Social: cannot tip self");
        require(msg.value > 0, "Social: no ETH sent");

        (bool success,) = payable(author).call{ value: msg.value }("");
        require(success, "Social: transfer failed");

        emit TipReceived(msg.sender, author, msg.value);
    }

    /// @notice Get follower count for a user
    function getFollowerCount(address user) external view returns (uint256) {
        return followerCount[user];
    }

    /// @notice Get following count for a user
    function getFollowingCount(address user) external view returns (uint256) {
        return followingCount[user];
    }
}
