# GenoSync: Sovereign Health on Solana

### The Infrastructure of Sovereign Health
> GenoSync lets users own their health data. Every wellness event is attested on **Solana**, and users sign in with the **Solana Mobile Stack** using biometric-secured passkeys — no seed phrases.

**Core Principle.** Your health data belongs to you, not a corporation. The blockchain is the audit trail; the Solana Mobile Seed Vault is the gatekeeper.

---

## Architecture

GenoSync leverages the Solana ecosystem to provide a high-performance, mobile-native health tracking experience.

```mermaid
graph TD
    subgraph Mobile_Device [Solana Mobile (Saga/Seeker)]
        A[React Native App]
        B[Solana Mobile Stack (SMS)]
        C[Seed Vault (Secure Enclave)]
        A --> B
        B --> C
    end

    subgraph Solana_Blockchain [Solana Mainnet]
        D[Anchor Staking Program]
        E[Bubblegum cNFT Program]
        F[SPL Governance (Realms)]
        G[AURA SPL Token]
    end

    subgraph Decentralized_Storage [Storage]
        H[Shadow Drive]
    end

    A -- "Sign Transactions" --> B
    B -- "Mint/Stake" --> D
    B -- "Mint" --> E
    B -- "Vote" --> F
    A -- "Encrypted Bio-Receipts" --> H
```

---

## Solana-Native Stack

| Layer | Tech | Purpose |
|---|---|---|
| **Frontend** | React Native | Android/iOS Mobile App |
| **Mobile Wallet** | Solana Mobile Stack | Secure Biometric Signing |
| **Blockchain** | Anchor Framework | Staking, Governance, cNFT Minting |
| **Storage** | Shadow Drive | Encrypted, decentralized wellness logs |
| **Identity** | World ID | Persistent privacy-preserving identity |

---

## Local Development

### Prerequisites
- [Solana CLI](https://docs.solana.com/cli/install-solana-cli-tools)
- [Anchor Framework](https://www.anchor-lang.com/docs/installation)
- [Node.js v18+](https://nodejs.org/)

```bash
# 1. Install dependencies
pnpm install

# 2. Build Solana Programs
cd artifacts/solana/programs/staking
anchor build

# 3. Start Test Validator
solana-test-validator

# 4. Run Mobile App
cd ../../app
npx react-native run-android
```

---

## Deployment

### Solana Deployment

```bash
# Deploy programs to devnet
bash artifacts/solana/scripts/deploy-solana.sh devnet

# Create AURA Token
spl-token create-token --decimals 9
```

---

## License

MIT License
