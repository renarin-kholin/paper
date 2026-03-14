// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./DeployHelpers.s.sol";
import "../contracts/Social.sol";

/**
 * @notice Deploy script for Social contract
 * @dev Social handles follows, likes, and tips
 */
contract DeploySocial is ScaffoldETHDeploy {
    function run() external ScaffoldEthDeployerRunner {
        new Social();
    }
}
