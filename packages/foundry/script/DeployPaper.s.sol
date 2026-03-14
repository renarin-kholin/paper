// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {ScaffoldETHDeploy} from "./DeployHelpers.s.sol";
import {Paper} from "../contracts/Paper.sol";

/**
 * @notice Deploy script for Paper contract
 * @dev Paper is a decentralized publishing platform where articles are ERC721 NFTs
 */
contract DeployPaper is ScaffoldETHDeploy {
    function run() external ScaffoldEthDeployerRunner {
        new Paper();
    }
}
