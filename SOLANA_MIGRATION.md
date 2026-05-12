# GenoSync Solana Migration Plan

## Overview
Complete migration from Base (Ethereum L2) to Solana, optimized for Solana Phone (Saga/Seeker).

## New Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Solana Phone (Saga/Seeker)                    │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │  GenoSync Android App (React Native)                       ││
│  │  • MediaPipe Vision (on-device)                            ││
│  │  • Solana Mobile Stack (SMS)                               ││
│  │  • Seed Vault (secure signing)                             ││
│  │  • Shadow Drive SDK                                        ││
│  └─────────────────────────────────────────────────────────────┘│
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                       Solana Mainnet                            │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │  AURA Token     │  │  Staking Pool   │  │  Governance DAO │  │
│  │  (SPL Token)    │  │  (stake AURA    │  │  (Realms/      │  │
│  │                 │  │   for boost)    │  │   governance)  │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  Compressed NFTs (cNFTs) - Wellness Achievements            │ │
│  │  • Minted for S/A grade sessions                            │ │
│  │  • State compression for low cost                           │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                     Shadow Drive                                │
│  • Permanent decentralized storage                              │
│  • Wellness receipts stored as JSON                             │
│  • 1GB+ storage per user                                        │
└─────────────────────────────────────────────────────────────────┘
```

## Programs to Deploy

### 1. AURA Token Program
- **Type**: SPL Token (standard)
- **Features**:
  - Mint authority: Wellness completion oracle
  - Initial supply: 0 (mint-on-demand)
  - Decimals: 9

### 2. Staking Program
- **Type**: Anchor Program
- **Features**:
  - Stake AURA tokens for wellness boost multiplier
  - 30-day lockup for base tier, 90-day for max boost
  - Rewards: 2x XP for staked users

### 3. Compressed NFT (cNFT) Program
- **Type**: Bubblegum (Metaplex)
- **Features**:
  - Mint cNFT for S-grade sessions
  - Collection: "GenoSync Wellness Legends"
  - Merkle tree for state compression

### 4. Governance Program
- **Type**: SPL Governance (Realms)
- **Features**:
  - AURA holders vote on challenge parameters
  - Proposal types: Challenge difficulty, reward rates, new features

## Tech Stack Changes

| Component | Old (Base) | New (Solana) |
|-----------|-----------|--------------|
| **Wallet** | Coinbase Smart Wallet | Seed Vault (Saga) / Phantom / Solflare |
| **Token** | ERC-20 AURA | SPL Token AURA |
| **Storage** | Filecoin | Shadow Drive |
| **NFTs** | ERC-721 | Compressed NFTs (cNFT) |
| **Staking** | Solidity contract | Anchor staking program |
| **Governance** | Snapshot | SPL Governance (Realms) |
| **Identity** | World ID | Solana wallet + optional World ID |

## File Structure

```
artifacts/
  solana/
    programs/
      aura_token/          # SPL token (standard)
      staking/             # Anchor staking program
      governance/          # DAO parameters
    sdk/
      src/
        staking.ts         # Staking client
        shadowDrive.ts     # Shadow Drive integration
        cnft.ts            # Compressed NFT minting
    app/                   # React Native Android app
      android/
      src/
        components/
        hooks/
        screens/
        solana/
          wallet.tsx       # Seed Vault integration
          programs.ts      # Program interactions
```

## Key Features for Solana Phone

### Seed Vault Integration
- Uses Saga's secure enclave for key storage
- Biometric auth (fingerprint) for transactions
- No seed phrases exposed to app

### Solana Mobile Stack (SMS)
- Solana Pay for instant token rewards
- Mobile Wallet Adapter for connection
- dApp Store submission ready

### Shadow Drive
- Direct file upload from mobile
- Encrypted wellness receipts
- 1GB+ free storage per user

## Migration Steps

1. **Deploy Solana Programs**
   ```bash
   cd artifacts/solana/programs
   anchor build
   anchor deploy --provider.cluster mainnet
   ```

2. **Create AURA Token**
   ```bash
   spl-token create-token --decimals 9
   spl-token create-account <TOKEN_MINT>
   ```

3. **Initialize Staking Pool**
   ```bash
   ts-node scripts/init-staking.ts
   ```

4. **Setup Shadow Drive**
   ```bash
   shadow-drive create-storage-account --name "genosync-receipts" --size 1GB
   ```

5. **Build Android App**
   ```bash
   cd artifacts/solana/app
   npx react-native run-android
   ```

## Cost Comparison

| Action | Base (ETH L2) | Solana |
|--------|---------------|--------|
| Token mint | ~$0.01 | ~$0.0001 |
| NFT mint (cNFT) | ~$0.50 | ~$0.001 |
| Staking | ~$0.01 | ~$0.0001 |
| Storage (1GB) | ~$5/mo | ~$0.10/mo |

## Security Features

1. **Seed Vault**: Keys never leave secure enclave
2. **Biometric Auth**: Fingerprint required for transactions
3. **Transaction Simulation**: All txs simulated before signing
4. **Shadow Drive Encryption**: Client-side encryption before upload

## Next Steps

See implementation files in:
- `artifacts/solana/programs/` - Rust/Anchor programs
- `artifacts/solana/app/` - React Native Android app
- `artifacts/solana/sdk/` - TypeScript SDK
