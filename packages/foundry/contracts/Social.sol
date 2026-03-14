// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/// @title Social - Social Features for Paper Protocol
/// @notice Handles follows, likes, and tips
contract Social {
    struct Comment {
        address author;
        string cid;
        uint256 createdAt;
    }

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

    /// @notice Track bookmarked articles per user
    mapping(address => mapping(uint256 => bool)) public bookmarked;

    /// @notice List of bookmarked article IDs for each user
    mapping(address => uint256[]) private userBookmarks;

    /// @notice Index position + 1 for O(1) bookmark removals
    mapping(address => mapping(uint256 => uint256)) private bookmarkIndexPlusOne;

    /// @notice On-chain pointers to comment CIDs per article
    mapping(uint256 => Comment[]) private commentsByArticle;

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

    /// @notice Emitted when a user bookmarks an article
    event Bookmarked(address indexed user, uint256 indexed tokenId);

    /// @notice Emitted when a user removes a bookmark
    event Unbookmarked(address indexed user, uint256 indexed tokenId);

    /// @notice Emitted when a comment CID is stored for an article
    event CommentAdded(uint256 indexed tokenId, address indexed author, string cid, uint256 indexed commentIndex);

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

    /// @notice Bookmark an article
    function bookmarkArticle(uint256 tokenId) external {
        require(!bookmarked[msg.sender][tokenId], "Social: already bookmarked");

        bookmarked[msg.sender][tokenId] = true;
        userBookmarks[msg.sender].push(tokenId);
        bookmarkIndexPlusOne[msg.sender][tokenId] = userBookmarks[msg.sender].length;

        emit Bookmarked(msg.sender, tokenId);
    }

    /// @notice Remove bookmark for an article
    function unbookmarkArticle(uint256 tokenId) external {
        uint256 indexPlusOne = bookmarkIndexPlusOne[msg.sender][tokenId];
        require(indexPlusOne > 0, "Social: not bookmarked");

        uint256 index = indexPlusOne - 1;
        uint256 lastIndex = userBookmarks[msg.sender].length - 1;

        if (index != lastIndex) {
            uint256 lastTokenId = userBookmarks[msg.sender][lastIndex];
            userBookmarks[msg.sender][index] = lastTokenId;
            bookmarkIndexPlusOne[msg.sender][lastTokenId] = index + 1;
        }

        userBookmarks[msg.sender].pop();
        delete bookmarkIndexPlusOne[msg.sender][tokenId];
        bookmarked[msg.sender][tokenId] = false;

        emit Unbookmarked(msg.sender, tokenId);
    }

    /// @notice Check whether user bookmarked an article
    function hasBookmarked(address user, uint256 tokenId) external view returns (bool) {
        return bookmarked[user][tokenId];
    }

    /// @notice Get all bookmarked article IDs for a user
    function getBookmarks(address user) external view returns (uint256[] memory) {
        return userBookmarks[user];
    }

    /// @notice Add comment by storing content CID pointer on-chain
    function addComment(uint256 tokenId, string calldata cid) external {
        require(bytes(cid).length > 0, "Social: empty CID");

        commentsByArticle[tokenId].push(Comment({ author: msg.sender, cid: cid, createdAt: block.timestamp }));
        uint256 commentIndex = commentsByArticle[tokenId].length - 1;

        emit CommentAdded(tokenId, msg.sender, cid, commentIndex);
    }

    /// @notice Number of comments for an article
    function getCommentCount(uint256 tokenId) external view returns (uint256) {
        return commentsByArticle[tokenId].length;
    }

    /// @notice Get one comment tuple for an article
    function getComment(uint256 tokenId, uint256 index)
        external
        view
        returns (address author, string memory cid, uint256 createdAt)
    {
        require(index < commentsByArticle[tokenId].length, "Social: comment index out of bounds");
        Comment memory comment = commentsByArticle[tokenId][index];
        return (comment.author, comment.cid, comment.createdAt);
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
