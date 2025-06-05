// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "forge-std/Test.sol";
import "../src/VeggieChain.sol";

contract VeggieChainTest is Test {
    VeggieChain veggie;

    function setUp() public {
        veggie = new VeggieChain();
    }

    function testAddProduct() public {
        veggie.addProduct("Bayam", 10000, 5);
        (uint id, string memory name,,,) = veggie.products(0);
        assertEq(id, 0);
        assertEq(name, "Bayam");
    }

    function testDynamicPriceImmediate() public {
        veggie.addProduct("Wortel", 20000, 5);
        uint price = veggie.getDynamicPrice(0);
        assertEq(price, 20000);
    }

    function testDynamicPriceAfter10Hours() public {
        veggie.addProduct("Buncis", 30000, 5);
        vm.warp(block.timestamp + 10 hours);
        uint price = veggie.getDynamicPrice(0);
        assertEq(price, 18000);
    }

    function testCheckout() public {
    veggie.addProduct("Tomat", 10000, 10);

    uint dynamicPrice = veggie.getDynamicPrice(0);
    uint quantity = 2;
    uint totalPrice = dynamicPrice * quantity;

    vm.deal(address(0xBEEF), 1 ether); // kasih ETH dulu
    vm.prank(address(0xBEEF)); // address palsu buat testing
    veggie.checkout{value: totalPrice}(0, quantity);

    (address buyer, uint amount, , bool claimed) = veggie.escrows(0);
    assertEq(buyer, address(0xBEEF));
    assertEq(amount, totalPrice);
    assertFalse(claimed);

    (, , , uint remainingStock, ) = veggie.products(0);
    assertEq(remainingStock, 8);
    }

    function testClaimEscrow() public {
        veggie.addProduct("Sawi", 10000, 5);
        uint price = veggie.getDynamicPrice(0);
        uint quantity = 2;
        uint total = price * quantity;

        address buyer = address(0xBEEF);
        vm.deal(buyer, 1 ether);

        vm.prank(buyer);
        veggie.checkout{value: total}(0, quantity);

        address payable seller = payable(address(0xA11CE));
        uint before = seller.balance;

        veggie.claimEscrow(0, seller);

        uint afterBalance = seller.balance;
        assertEq(afterBalance - before, total);

        (, , , bool claimed) = veggie.escrows(0);
        assertTrue(claimed);
    }

    function testCancelEscrow() public {
        veggie.addProduct("Bayam", 10000, 5);
        uint price = veggie.getDynamicPrice(0);
        uint quantity = 2;
        uint total = price * quantity;

        address buyer = address(0xBEEF);
        vm.deal(buyer, 1 ether);

        vm.prank(buyer);
        veggie.checkout{value: total}(0, quantity);

        vm.warp(block.timestamp + 31 minutes);

        uint before = buyer.balance;

        vm.prank(buyer);
        veggie.cancelEscrow(0);

        uint afterBalance = buyer.balance;
        assertEq(afterBalance - before, total);

        (, , , bool claimed) = veggie.escrows(0);
        assertTrue(claimed);
    }
}