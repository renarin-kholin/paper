//SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {ScaffoldETHDeploy} from "./DeployHelpers.s.sol";
import {console} from "forge-std/Script.sol";
import {AdCampaigns} from "../contracts/AdCampaigns.sol";
import {Paper} from "../contracts/Paper.sol";
import {Social} from "../contracts/Social.sol";

/**
 * @notice Main deployment script for all contracts
 * @dev Run this when you want to deploy multiple contracts at once
 *
 * Example: yarn deploy # runs this script(without`--file` flag)
 */
contract DeployScript is ScaffoldETHDeploy {
    function run() external ScaffoldEthDeployerRunner {
        // Deploy Paper contract (core publishing)
        address paperAddress = address(new Paper());
        console.log("Paper deployed at:", paperAddress);
        deployments.push(Deployment({name: "Paper", addr: paperAddress}));

        // Deploy Social contract (follows, likes, tips)
        address socialAddress = address(new Social());
        console.log("Social deployed at:", socialAddress);
        deployments.push(Deployment({name: "Social", addr: socialAddress}));

        // Deploy AdCampaigns contract (advertising)
        address adCampaignsAddress = address(new AdCampaigns(paperAddress));
        console.log("AdCampaigns deployed at:", adCampaignsAddress);
        console.log("  -> Paper contract reference:", paperAddress);
        deployments.push(
            Deployment({name: "AdCampaigns", addr: adCampaignsAddress})
        );
    }
}
