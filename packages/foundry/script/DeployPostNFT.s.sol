// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./DeployHelpers.s.sol";
import "../contracts/PostNFT.sol";

/**
 * @notice Deploy script for PostNFT contract
 */
contract DeployPostNFT is ScaffoldETHDeploy {
    function run() external ScaffoldEthDeployerRunner {
        new PostNFT(deployer);
    }
}
