// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "../contracts/PostNFT.sol";

contract PostNFTTest is Test {
    PostNFT public postNFT;

    address public owner = vm.addr(1);
    address public author = vm.addr(2);
    address public notAuthor = vm.addr(3);
    address public advertiser = vm.addr(4);
    address public reader = vm.addr(5);

    event PostMinted(uint256 indexed tokenId, address indexed author, string contentURI, bool paywalled, uint256 paywallPrice);
    event PostUnlocked(uint256 indexed tokenId, address indexed reader, uint256 amountPaid);
    event AdCommitted(uint256 indexed tokenId, bytes32 commitHash);
    event AdSpacePurchased(uint256 indexed tokenId, address indexed advertiser, string adContentURI, uint256 expiresAt);
    event PostConfigured(uint256 indexed tokenId, address indexed author, bool paywalled, uint256 paywallPrice);
    event AdSpaceConfigured(uint256 indexed tokenId, address indexed author, uint256 pricePerDay, bool enabled);

    function setUp() public {
        postNFT = new PostNFT(owner);
    }

    function testMintPostAsRelayer() public {
        vm.expectEmit(true, true, false, true);
        emit PostMinted(0, author, "ipfs://post-0", true, 5e6);

        vm.prank(owner);
        uint256 tokenId = postNFT.mintPost(author, "ipfs://post-0", true, 5e6, 2e6);

        assertEq(tokenId, 0);
        assertEq(postNFT.ownerOf(tokenId), author);
        assertEq(postNFT.postAuthors(tokenId), author);

        PostNFT.PostConfig memory post = postNFT.getPostConfig(tokenId);
        assertEq(post.author, author);
        assertEq(post.paywalled, true);
        assertEq(post.paywallPrice, 5e6);
        assertEq(post.totalEarnings, 0);

        PostNFT.AdSpace memory ad = postNFT.getAdSpace(tokenId);
        assertEq(ad.pricePerDay, 2e6);
        assertEq(ad.enabled, true);
    }

    function testMintPostRevertsForNonOwner() public {
        vm.prank(notAuthor);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, notAuthor));
        postNFT.mintPost(author, "ipfs://post-0", true, 5e6, 2e6);
    }

    function testMintPostRevertsForPaywalledWithoutPrice() public {
        vm.prank(owner);
        vm.expectRevert("Invalid paywall price");
        postNFT.mintPost(author, "ipfs://post-0", true, 0, 2e6);
    }

    function testSetAdContentRevertsWhenCurrentAdIsActive() public {
        uint256 tokenId = _mintDefaultPost();

        vm.prank(owner);
        postNFT.setAdContent(tokenId, advertiser, "ipfs://ad-1", 3);

        vm.prank(owner);
        vm.expectRevert("Current ad still active");
        postNFT.setAdContent(tokenId, advertiser, "ipfs://ad-2", 1);
    }

    function testConfigureAdSpaceByAuthor() public {
        uint256 tokenId = _mintDefaultPost();

        vm.expectEmit(true, true, false, true);
        emit AdSpaceConfigured(tokenId, author, 3e6, false);

        vm.prank(author);
        postNFT.configureAdSpace(tokenId, 3e6, false);

        PostNFT.AdSpace memory ad = postNFT.getAdSpace(tokenId);
        assertEq(ad.pricePerDay, 3e6);
        assertEq(ad.enabled, false);
    }

    function testConfigurePostByAuthor() public {
        uint256 tokenId = _mintDefaultPost();

        vm.expectEmit(true, true, false, true);
        emit PostConfigured(tokenId, author, false, 0);
        vm.expectEmit(true, true, false, true);
        emit AdSpaceConfigured(tokenId, author, 4e6, true);

        vm.prank(author);
        postNFT.configurePost(tokenId, false, 0, 4e6, true);

        PostNFT.PostConfig memory post = postNFT.getPostConfig(tokenId);
        assertEq(post.paywalled, false);
        assertEq(post.paywallPrice, 0);

        PostNFT.AdSpace memory ad = postNFT.getAdSpace(tokenId);
        assertEq(ad.pricePerDay, 4e6);
        assertEq(ad.enabled, true);
    }

    function testConfigurePostRevertsForNonAuthor() public {
        uint256 tokenId = _mintDefaultPost();

        vm.prank(notAuthor);
        vm.expectRevert("Not the author");
        postNFT.configurePost(tokenId, true, 4e6, 2e6, true);
    }

    function testConfigurePostRevertsForInvalidPaywallPrice() public {
        uint256 tokenId = _mintDefaultPost();

        vm.prank(author);
        vm.expectRevert("Invalid paywall price");
        postNFT.configurePost(tokenId, true, 0, 2e6, true);
    }

    function testConfigurePostRevertsWhenAdEnabledWithZeroPrice() public {
        uint256 tokenId = _mintDefaultPost();

        vm.prank(author);
        vm.expectRevert("Invalid ad price");
        postNFT.configurePost(tokenId, false, 0, 0, true);
    }

    function testConfigureAdSpaceRevertsForNonAuthor() public {
        uint256 tokenId = _mintDefaultPost();

        vm.prank(notAuthor);
        vm.expectRevert("Not the author");
        postNFT.configureAdSpace(tokenId, 3e6, true);
    }

    function testCommitRevealSuccess() public {
        uint256 tokenId = _mintDefaultPost();
        bytes32 salt = keccak256("salt");
        bytes32 commitHash = postNFT.computeCommitHash(tokenId, advertiser, "ipfs://ad-commit", 2, salt);

        vm.expectEmit(true, false, false, true);
        emit AdCommitted(tokenId, commitHash);

        vm.prank(owner);
        postNFT.commitAdPurchase(tokenId, commitHash);

        assertEq(postNFT.pendingAdCommits(tokenId), commitHash);

        vm.expectEmit(true, true, false, true);
        emit AdSpacePurchased(tokenId, advertiser, "ipfs://ad-commit", block.timestamp + 2 days);

        vm.prank(owner);
        postNFT.revealAdPurchase(tokenId, advertiser, "ipfs://ad-commit", 2, salt);

        assertEq(postNFT.pendingAdCommits(tokenId), bytes32(0));

        PostNFT.AdSpace memory ad = postNFT.getAdSpace(tokenId);
        assertEq(ad.advertiser, advertiser);
        assertEq(ad.adContentURI, "ipfs://ad-commit");
        assertEq(ad.expiresAt, block.timestamp + 2 days);
    }

    function testCommitRevealRevertsOnHashMismatch() public {
        uint256 tokenId = _mintDefaultPost();
        bytes32 goodSalt = keccak256("good");
        bytes32 badSalt = keccak256("bad");
        bytes32 commitHash = postNFT.computeCommitHash(tokenId, advertiser, "ipfs://ad", 1, goodSalt);

        vm.prank(owner);
        postNFT.commitAdPurchase(tokenId, commitHash);

        vm.prank(owner);
        vm.expectRevert("Invalid reveal");
        postNFT.revealAdPurchase(tokenId, advertiser, "ipfs://ad", 1, badSalt);
    }

    function testIsAdActiveTransitionsToFalseOnExpiry() public {
        uint256 tokenId = _mintDefaultPost();

        vm.prank(owner);
        postNFT.setAdContent(tokenId, advertiser, "ipfs://ad", 1);

        assertEq(postNFT.isAdActive(tokenId), true);

        vm.warp(block.timestamp + 2 days);
        assertEq(postNFT.isAdActive(tokenId), false);
    }

    function testDurationValidation() public {
        uint256 tokenId = _mintDefaultPost();

        vm.prank(owner);
        vm.expectRevert("Invalid duration");
        postNFT.setAdContent(tokenId, advertiser, "ipfs://ad", 0);

        vm.prank(owner);
        vm.expectRevert("Invalid duration");
        postNFT.setAdContent(tokenId, advertiser, "ipfs://ad", 366);
    }

    function testRecordUnlockForPaywalledPost() public {
        uint256 tokenId = _mintDefaultPost();

        vm.expectEmit(true, true, false, true);
        emit PostUnlocked(tokenId, reader, 5e6);

        vm.prank(owner);
        postNFT.recordUnlock(tokenId, reader, 5e6);

        assertEq(postNFT.hasUnlocked(tokenId, reader), true);

        PostNFT.PostConfig memory post = postNFT.getPostConfig(tokenId);
        assertEq(post.totalEarnings, 5e6);
    }

    function testRecordUnlockRevertsForNonOwner() public {
        uint256 tokenId = _mintDefaultPost();

        vm.prank(notAuthor);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, notAuthor));
        postNFT.recordUnlock(tokenId, reader, 5e6);
    }

    function testRecordUnlockRevertsForNonPaywalledPost() public {
        uint256 tokenId = _mintFreePost();

        vm.prank(owner);
        vm.expectRevert("Post is not paywalled");
        postNFT.recordUnlock(tokenId, reader, 5e6);
    }

    function testRecordUnlockRevertsWhenAmountIsBelowPaywallPrice() public {
        uint256 tokenId = _mintDefaultPost();

        vm.prank(owner);
        vm.expectRevert("Insufficient payment");
        postNFT.recordUnlock(tokenId, reader, 1e6);
    }

    function testRecordUnlockRevertsForInvalidReader() public {
        uint256 tokenId = _mintDefaultPost();

        vm.prank(owner);
        vm.expectRevert("Invalid reader");
        postNFT.recordUnlock(tokenId, address(0), 5e6);
    }

    function testRecordUnlockRevertsWhenAlreadyUnlocked() public {
        uint256 tokenId = _mintDefaultPost();

        vm.prank(owner);
        postNFT.recordUnlock(tokenId, reader, 5e6);

        vm.prank(owner);
        vm.expectRevert("Already unlocked");
        postNFT.recordUnlock(tokenId, reader, 5e6);
    }

    function testSetAdContentRevertsForNonOwner() public {
        uint256 tokenId = _mintDefaultPost();

        vm.prank(notAuthor);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, notAuthor));
        postNFT.setAdContent(tokenId, advertiser, "ipfs://ad", 1);
    }

    function testCommitAdPurchaseRevertsForNonOwner() public {
        uint256 tokenId = _mintDefaultPost();
        bytes32 commitHash = keccak256("commit");

        vm.prank(notAuthor);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, notAuthor));
        postNFT.commitAdPurchase(tokenId, commitHash);
    }

    function testRevealAdPurchaseRevertsForNonOwner() public {
        uint256 tokenId = _mintDefaultPost();
        bytes32 salt = keccak256("salt");
        bytes32 commitHash = postNFT.computeCommitHash(tokenId, advertiser, "ipfs://ad", 1, salt);

        vm.prank(owner);
        postNFT.commitAdPurchase(tokenId, commitHash);

        vm.prank(notAuthor);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, notAuthor));
        postNFT.revealAdPurchase(tokenId, advertiser, "ipfs://ad", 1, salt);
    }

    function testAdFunctionsRevertWhenAdSpaceDisabled() public {
        uint256 tokenId = _mintDefaultPost();

        vm.prank(author);
        postNFT.configureAdSpace(tokenId, 2e6, false);

        vm.prank(owner);
        vm.expectRevert("Ad space disabled");
        postNFT.setAdContent(tokenId, advertiser, "ipfs://ad", 1);

        vm.prank(owner);
        vm.expectRevert("Ad space disabled");
        postNFT.commitAdPurchase(tokenId, keccak256("commit"));

        vm.prank(owner);
        vm.expectRevert("Ad space disabled");
        postNFT.revealAdPurchase(tokenId, advertiser, "ipfs://ad", 1, keccak256("salt"));
    }

    function testFunctionsRevertForNonexistentToken() public {
        uint256 tokenId = 999;

        vm.prank(owner);
        vm.expectRevert("Token does not exist");
        postNFT.setAdContent(tokenId, advertiser, "ipfs://ad", 1);

        vm.prank(owner);
        vm.expectRevert("Token does not exist");
        postNFT.commitAdPurchase(tokenId, keccak256("commit"));

        vm.prank(owner);
        vm.expectRevert("Token does not exist");
        postNFT.recordUnlock(tokenId, reader, 5e6);

        vm.prank(author);
        vm.expectRevert("Token does not exist");
        postNFT.configureAdSpace(tokenId, 1e6, true);

        vm.prank(author);
        vm.expectRevert("Token does not exist");
        postNFT.configurePost(tokenId, true, 5e6, 1e6, true);

        vm.expectRevert("Token does not exist");
        postNFT.isAdActive(tokenId);

        vm.expectRevert("Token does not exist");
        postNFT.getAdSpace(tokenId);
    }

    function testDurationBoundaryValuesSucceed() public {
        uint256 tokenId = _mintDefaultPost();

        vm.prank(owner);
        postNFT.setAdContent(tokenId, advertiser, "ipfs://ad-min", 1);

        vm.warp(block.timestamp + 2 days);

        vm.prank(owner);
        postNFT.setAdContent(tokenId, advertiser, "ipfs://ad-max", 365);

        PostNFT.AdSpace memory ad = postNFT.getAdSpace(tokenId);
        assertEq(ad.adContentURI, "ipfs://ad-max");
    }

    function testCommitCannotBeOverwritten() public {
        uint256 tokenId = _mintDefaultPost();
        bytes32 firstCommit = keccak256("first");
        bytes32 secondCommit = keccak256("second");

        vm.prank(owner);
        postNFT.commitAdPurchase(tokenId, firstCommit);

        vm.prank(owner);
        vm.expectRevert("Commit already exists");
        postNFT.commitAdPurchase(tokenId, secondCommit);
    }

    function testTotalEarningsIncludesAdSales() public {
        uint256 tokenId = _mintDefaultPost();

        vm.prank(owner);
        postNFT.setAdContent(tokenId, advertiser, "ipfs://ad", 3);

        PostNFT.PostConfig memory post = postNFT.getPostConfig(tokenId);
        assertEq(post.totalEarnings, 6e6);
    }

    function testTotalEarningsIncludesRevealAdSales() public {
        uint256 tokenId = _mintDefaultPost();
        bytes32 salt = keccak256("earnings-salt");
        bytes32 commitHash = postNFT.computeCommitHash(tokenId, advertiser, "ipfs://ad-reveal", 2, salt);

        vm.prank(owner);
        postNFT.commitAdPurchase(tokenId, commitHash);

        vm.prank(owner);
        postNFT.revealAdPurchase(tokenId, advertiser, "ipfs://ad-reveal", 2, salt);

        PostNFT.PostConfig memory post = postNFT.getPostConfig(tokenId);
        assertEq(post.totalEarnings, 4e6);
    }

    function testTotalEarningsAccumulatesUnlockAndAdRevenue() public {
        uint256 tokenId = _mintDefaultPost();

        vm.prank(owner);
        postNFT.recordUnlock(tokenId, reader, 5e6);

        vm.prank(owner);
        postNFT.setAdContent(tokenId, advertiser, "ipfs://ad", 2);

        PostNFT.PostConfig memory post = postNFT.getPostConfig(tokenId);
        assertEq(post.totalEarnings, 9e6);
    }

    function _mintDefaultPost() private returns (uint256 tokenId) {
        vm.prank(owner);
        tokenId = postNFT.mintPost(author, "ipfs://post", true, 5e6, 2e6);
    }

    function _mintFreePost() private returns (uint256 tokenId) {
        vm.prank(owner);
        tokenId = postNFT.mintPost(author, "ipfs://post-free", false, 0, 2e6);
    }
}
