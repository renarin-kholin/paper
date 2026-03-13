//SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./DeployHelpers.s.sol";
import { DeployPostNFT } from "./DeployPostNFT.s.sol";

/**
 * @notice Main deployment script for all contracts
 * @dev Run this when you want to deploy multiple contracts at once
 *
 * Example: yarn deploy # runs this script(without`--file` flag)
 */
contract DeployScript is ScaffoldETHDeploy {
    function run() external {
        // Child deploy scripts own the broadcast lifecycle via ScaffoldEthDeployerRunner.
        // Keeping this parent script non-broadcasting avoids nested vm.startBroadcast reverts.
        // Deploys all your contracts sequentially
        // Add new deployments here when needed

        DeployPostNFT deployPostNFT = new DeployPostNFT();
        deployPostNFT.run();

        // Deploy another contract
        // DeployMyContract myContract = new DeployMyContract();
        // myContract.run();
    }
}
