// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge-std/Script.sol";
import "../src/VeggieChain.sol";

contract DeployVeggieChain is Script {
    function run() external {
        vm.startBroadcast();
        new VeggieChain();
        vm.stopBroadcast();
    }
}