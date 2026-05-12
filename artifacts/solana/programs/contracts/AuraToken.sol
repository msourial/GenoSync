// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * AURA Token — Sovereign Wellness Rewards (GenoSync)
 *
 * Minted by GenoSync when users complete verified health/bio events.
 * 1 XP = 1 AURA token (18 decimals).
 *
 * Deployed on Base (Coinbase L2). EVM-compatible — same Solidity as Flow EVM.
 */
contract AuraToken is ERC20, Ownable {
    mapping(address => bool) public minters;

    event MinterUpdated(address indexed account, bool allowed);
    event BioReceiptMinted(address indexed to, uint256 amount, bytes32 indexed receiptId);

    constructor(address initialOwner)
        ERC20("AURA Wellness Token", "AURA")
        Ownable(initialOwner)
    {
        minters[initialOwner] = true;
    }

    modifier onlyMinter() {
        require(minters[msg.sender], "AURA: not a minter");
        _;
    }

    function setMinter(address account, bool allowed) external onlyOwner {
        minters[account] = allowed;
        emit MinterUpdated(account, allowed);
    }

    function mint(address to, uint256 amount) external onlyMinter {
        _mint(to, amount);
    }

    /**
     * Mint with a GenoSync receipt id (e.g. KMS-encrypted bio record id hash).
     * Lets the indexer correlate on-chain rewards with off-chain encrypted health events.
     */
    function mintWithReceipt(address to, uint256 amount, bytes32 receiptId) external onlyMinter {
        _mint(to, amount);
        emit BioReceiptMinted(to, amount, receiptId);
    }
}
