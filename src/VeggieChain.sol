// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract VeggieChain {
    struct Product {
        uint id;
        string name;
        uint basePrice;
        uint stock;
        uint addedAt;
    }

    struct Escrow {
        address buyer;
        uint amount;
        uint timestamp; // waktu checkout
        bool claimed;
    }

    mapping(uint => Product) public products;
    uint public nextProductId;

    mapping(uint => Escrow) public escrows;
    uint public nextEscrowId;

    uint public lastUpdated;
    address public owner;

    constructor() {
        owner = msg.sender;
    }

    function addProduct(string memory _name, uint _basePrice, uint _stock) public {
        products[nextProductId] = Product(nextProductId, _name, _basePrice, _stock, block.timestamp);
        nextProductId++;
    }

    function getDynamicPrice(uint productId) public view returns (uint) {
        Product memory p = products[productId];
        require(p.stock > 0, "Out of stock");

        if (block.timestamp > p.addedAt + 1 days) return 0;

        uint hour = (block.timestamp + 7 hours) / 60 / 60 % 24;

        if (hour >= 22 || hour < 4) return 0;
        if (hour >= 6 && hour <= 10) return p.basePrice;
        if (hour >= 10 && hour <= 15) return (p.basePrice * 80) / 100;
        if (hour >= 15 && hour <= 21) return (p.basePrice * 60) / 100;
        if (hour >= 21 && hour < 22) return (p.basePrice * 60) / 100 * 50 / 100;

        return p.basePrice;
    }

    function checkout(uint productId) public payable {
        Product storage p = products[productId];
        require(p.stock > 0, "Out of stock");
        require(block.timestamp <= p.addedAt + 1 days, "Product expired");

        uint hour = (block.timestamp + 7 hours) / 60 / 60 % 24;
        require(!(hour >= 22 || hour < 4), "Transaksi ditutup sementara");

        uint price = getDynamicPrice(productId);
        require(msg.value >= price, "Insufficient payment");

        p.stock--;

        escrows[nextEscrowId] = Escrow(msg.sender, msg.value, block.timestamp, false);
        nextEscrowId++;
    }

    function claimEscrow(uint escrowId, address payable to) public {
        Escrow storage e = escrows[escrowId];
        require(!e.claimed, "Sudah diambil");
        require(e.amount > 0, "Escrow tidak valid");

        e.claimed = true;
        to.transfer(e.amount); // kirim ke penjual
    }

    function cancelEscrow(uint escrowId) public {
        Escrow storage e = escrows[escrowId];
        require(!e.claimed, "Sudah diambil");
        require(e.amount > 0, "Escrow tidak valid");
        require(block.timestamp >= e.timestamp + 30 minutes, "Belum 30 menit");
        require(msg.sender == e.buyer, "Bukan pembeli");

        e.claimed = true;
        payable(e.buyer).transfer(e.amount);
    }

    function setTimestamp(uint _timestamp) public {
        lastUpdated = _timestamp;
    }
}