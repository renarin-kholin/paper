//SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import {AdCampaigns} from "../contracts/AdCampaigns.sol";
import {ScaffoldETHDeploy} from "./DeployHelpers.s.sol";
import {console} from "forge-std/Script.sol";

/**
 * @notice Deployment script for AdCampaigns contract
 * @dev Deploys the advertising campaign management contract
 *
 * Prerequisites: Paper contract must be deployed first
 * Set PAPER_CONTRACT_ADDRESS environment variable or update the hardcoded address below
 *
 * Usage:
 *   yarn deploy --file DeployAdCampaigns.s.sol
 *
 * With custom Paper address:
 *   PAPER_CONTRACT_ADDRESS=0x123... yarn deploy --file DeployAdCampaigns.s.sol
 */
contract DeployAdCampaigns is ScaffoldETHDeploy {
    function run() external ScaffoldEthDeployerRunner {
        // Get Paper contract address from environment variable
        // If not set, falls back to a default address (update this after Paper deployment)
        address paperAddress = vm.envOr(
            "PAPER_CONTRACT_ADDRESS",
            0x3193fD94733e770aaCbd49c3B09Cb9DeFA928275 // Update this with your Paper contract address
        );

        require(
            paperAddress != address(0),
            "DeployAdCampaigns: Paper contract address not configured. Set PAPER_CONTRACT_ADDRESS env var"
        );

        console.log("Deploying AdCampaigns with Paper contract:", paperAddress);

        AdCampaigns adCampaigns = new AdCampaigns(paperAddress);

        console.log("AdCampaigns deployed at:", address(adCampaigns));
        console.log("Paper contract reference:", paperAddress);

        // Add to deployments array for export
        deployments.push(
            Deployment({name: "AdCampaigns", addr: address(adCampaigns)})
        );
    }
}
