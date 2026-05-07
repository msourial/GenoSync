# GenoSync

### Sovereign Bio-Data — KMS-encrypted, on-chain attested, passkey-secured

> GenoSync lets users own their health & bio data. Every payload is **envelope-encrypted with AWS KMS** before it ever touches storage, every wellness event is **attested on Base (Coinbase L2)**, and users sign in with a **Coinbase Smart Wallet** using FaceID/TouchID — no seed phrases, no extensions.

**Core principle.** The plaintext of a user's bio data should never exist outside an authenticated session. The blockchain is the audit trail; the KMS key is the gatekeeper; the passkey is the user's identity.

---

## What's new in this release

| Pillar | Change | Where |
|---|---|---|
| **AWS deployment** | Full stack on AWS — no Vercel, no Heroku | [`infra/aws/`](infra/aws/) |
| **AWS KMS encryption** | Envelope encryption (AES-256-GCM) for every off-chain bio payload | [`artifacts/api/src/lib/kms.ts`](artifacts/api/src/lib/kms.ts) |
| **Base L2 contracts** | `AuraToken` ERC-20 deploys to Base / Base Sepolia (Coinbase L2) | [`artifacts/contracts/`](artifacts/contracts/) |
| **Coinbase Smart Wallet** | Passkey login (FaceID / TouchID) via `@coinbase/wallet-sdk` | [`artifacts/web/src/lib/coinbase-smart-wallet.ts`](artifacts/web/src/lib/coinbase-smart-wallet.ts) |
| **Multi-chain switch** | `VITE_GENOSYNC_CHAIN` selects Base / Base Sepolia / Flow at build time | [`artifacts/web/src/lib/chains.ts`](artifacts/web/src/lib/chains.ts) |
| **Encrypted bio API** | `POST /api/bio/encrypt`, `POST /api/bio/:id/decrypt`, `GET /api/bio/by-wallet/:address` | [`artifacts/api/src/routes/bio.ts`](artifacts/api/src/routes/bio.ts) |
| **Coinbase OnchainKit** | `OnchainKitProvider` wraps the app; on-chain Identity card (Avatar / Name / Address / Balance / Coinbase-verified Badge) on Dashboard | [`artifacts/web/src/providers/OnchainKitProviderWrapper.tsx`](artifacts/web/src/providers/OnchainKitProviderWrapper.tsx), [`artifacts/web/src/components/IdentityCard.tsx`](artifacts/web/src/components/IdentityCard.tsx) |
| **Coinbase Paymaster** | EIP-5792 `wallet_sendCalls` with `paymasterService` capability — AURA mints are gas-free for users when `VITE_COINBASE_PAYMASTER_URL` is set | [`artifacts/web/src/lib/aura-token.ts`](artifacts/web/src/lib/aura-token.ts) |
| **AWS Bedrock (Claude AI)** | Wellness coach powered by `anthropic.claude-3-5-sonnet` on Bedrock; `/api/coach` route, mock mode for local dev | [`artifacts/api/src/lib/bedrock.ts`](artifacts/api/src/lib/bedrock.ts), [`artifacts/api/src/routes/coach.ts`](artifacts/api/src/routes/coach.ts) |
| **Solana cross-chain** | Wallet adapter (Phantom) + SPL AURA mint helper — same 1 XP = 1 AURA reward, mintable on Solana too | [`artifacts/web/src/providers/SolanaProviderWrapper.tsx`](artifacts/web/src/providers/SolanaProviderWrapper.tsx), [`artifacts/web/src/lib/solana-aura.ts`](artifacts/web/src/lib/solana-aura.ts) |

---

## Architecture

### High-level

```
                          ┌─────────────────────────────────────────────────┐
                          │              Browser — GenoSync PWA            │
                          │                                                 │
                          │   Coinbase Smart Wallet (Passkey · FaceID)      │
                          │   ────────────────────────────────────────      │
                          │   World ID  ·  Wearable OAuth  ·  Vite SPA      │
                          └────────────────────────┬────────────────────────┘
                                                   │  HTTPS
                          ┌────────────────────────▼────────────────────────┐
                          │  CloudFront (TLS / edge cache / SPA routing)    │
                          │   origin ─▶ S3 bucket  (Vite build output)      │
                          └────────────────────────┬────────────────────────┘
                                                   │ /api/*
                          ┌────────────────────────▼────────────────────────┐
                          │  Application Load Balancer                      │
                          │   ─▶ ECS Fargate · genosync-api task           │
                          │       (Docker image from ECR)                   │
                          └─────┬───────────────────────┬───────────────────┘
                                │                       │
              ┌─────────────────▼──────────┐   ┌────────▼───────────────────┐
              │  AWS KMS                   │   │  Base (Coinbase L2)        │
              │  alias/genosync-userdata  │   │  AuraToken ERC-20          │
              │                            │   │   ─ mint(to, amount)        │
              │  GenerateDataKey / Decrypt │   │   ─ mintWithReceipt(        │
              │  EncryptionContext binds   │   │       to, amount, rcpt)     │
              │   { wallet, app }          │   │                            │
              └────────────────────────────┘   └────────────────────────────┘
```

### Encryption envelope (per payload)

```
                       ┌──────────────────────────────────────────────────┐
                       │              CLIENT (browser)                    │
                       │  Wellness event JSON ──── HTTPS ─────▶  /encrypt │
                       └──────────────────────────────────────────────────┘
                                                          │
                                                          ▼
        ┌─────────────────────────────────────────────────────────────────┐
        │                    GENOSYNC API (ECS Fargate)                  │
        │                                                                 │
        │   1.  KMS.GenerateDataKey(KeySpec=AES_256,                      │
        │                          EncryptionContext={wallet,app})        │
        │             │                                                   │
        │             ├─▶ Plaintext DEK (256-bit, in-memory only)         │
        │             └─▶ Ciphertext blob (the wrapped DEK — persisted)   │
        │                                                                 │
        │   2.  AES-256-GCM(plaintext_payload, DEK, random_iv)            │
        │             │                                                   │
        │             ├─▶ ciphertext  (base64)                            │
        │             ├─▶ iv          (12 bytes)                          │
        │             └─▶ authTag     (16 bytes)                          │
        │                                                                 │
        │   3.  Buffer.fill(0)  on the plaintext DEK   (memory wipe)      │
        │                                                                 │
        │   4.  Persist envelope: { ciphertext, iv, authTag,              │
        │                           encryptedDataKey, kmsKeyId,           │
        │                           algorithm, encryptedAt }              │
        └─────────────────────────────────────────────────────────────────┘

  Decryption reverses the flow:
     KMS.Decrypt(encryptedDataKey, EncryptionContext={wallet, app})
        ──▶ AES-256-GCM-Decrypt(ciphertext, DEK, iv, authTag)
        ──▶ DEK wiped, plaintext returned to caller, never persisted.
```

**Why envelope encryption.** The KMS key never leaves AWS HSMs. A leaked database is just ciphertext + a wrapped DEK; an attacker still needs `kms:Decrypt` permission on the key, and **every Decrypt call is logged to CloudTrail**. The `EncryptionContext` `{wallet, app}` is authenticated additional data — substituting one user's envelope for another's fails the AEAD check.

### Wallet & on-chain flow

```
       LockScreen Step 2: Wallet Connect
       ────────────────────────────────────────────────────────────
       ┌─────────────────────────────┐    ┌────────────────────────┐
       │  Coinbase Smart Wallet      │    │  Privy Embedded Wallet │
       │  (RECOMMENDED)              │    │  (fallback / email)    │
       │                             │    │                        │
       │  Passkey · FaceID / TouchID │    │  Email magic-link      │
       │  Smart-contract wallet on   │    │  EOA on Base           │
       │  Base — gas-free UX via     │    │                        │
       │  paymaster                  │    │                        │
       └──────────────┬──────────────┘    └─────────────┬──────────┘
                      │                                 │
                      └──────────────┬──────────────────┘
                                     ▼
                       GenoSync session: walletAddress
                                     │
                       Wellness event completes (XP earned)
                                     │
              ┌──────────────────────┼──────────────────────────────┐
              ▼                                                     ▼
   POST /api/bio/encrypt                                 AuraToken.mint(to, amount)
   (envelope-encrypted via KMS)                          on Base / Base Sepolia
              │                                                     │
              ▼                                                     ▼
   Off-chain encrypted bio record                        On-chain ERC-20 receipt
```

### Repo layout

```
GenoSync-main/
├── artifacts/
│   ├── api/                           Express 5 API (ECS Fargate target)
│   │   ├── src/
│   │   │   ├── lib/kms.ts             KMS envelope encrypt / decrypt
│   │   │   └── routes/bio.ts          /api/bio/* — encrypted bio store
│   │   ├── Dockerfile                 multi-stage Node 20 alpine image
│   │   └── .dockerignore
│   ├── web/                           React 19 / Vite 7 PWA (S3 + CloudFront)
│   │   └── src/
│   │       ├── lib/
│   │       │   ├── chains.ts          Base / Base Sepolia / Flow EVM defs
│   │       │   ├── coinbase-smart-wallet.ts   passkey-only SDK adapter
│   │       │   └── aura-token.ts      mint / balance against activeChain
│   │       ├── hooks/
│   │       │   └── use-coinbase-smart-wallet.ts   React state for the SDK
│   │       └── pages/LockScreen.tsx   passkey-first wallet step
│   └── contracts/                     Hardhat — AuraToken on Base
│       ├── contracts/AuraToken.sol    OpenZeppelin v5, mintWithReceipt
│       ├── scripts/deploy.ts          deploy + auto-verify on BaseScan
│       └── hardhat.config.ts          base + baseSepolia networks
└── infra/
    └── aws/
        ├── cloudformation-genosync.yml   one-shot stack provisioning
        ├── deploy-frontend.sh             S3 sync + CloudFront invalidation
        ├── deploy-api.sh                  ECR push + ECS force-redeploy
        ├── ecs-task-definition.json       Fargate task w/ KMS-scoped role
        └── README.md                      ops runbook
```

---

## Tech stack

| Layer | Tech | Hosted on |
|---|---|---|
| **Frontend** | React 19, Vite 7, TypeScript 5.9, Tailwind CSS 4, vite-plugin-pwa | **AWS S3 + CloudFront** |
| **Backend** | Express 5, pino, Drizzle ORM, PostgreSQL | **AWS ECS Fargate** (image in ECR) |
| **Encryption** | AWS KMS (envelope), AES-256-GCM, `@aws-sdk/client-kms` v3 | **AWS KMS** (HSM-backed key) |
| **Wallets** | `@coinbase/wallet-sdk` 4.x (`smartWalletOnly`), `@privy-io/react-auth` (fallback) | client-side / passkeys via WebAuthn |
| **Blockchain** | Solidity 0.8.24, OpenZeppelin v5, Hardhat, viem 2.x | **Base** (chain 8453) / **Base Sepolia** (84532) |
| **Identity** | World ID (`@worldcoin/idkit`) | client + server verification |
| **Storage** | Filecoin / IPFS via `@storacha/client` | off-chain receipts |

---

## Local development

The repo is a pnpm workspace. Vite proxies `/api` to the API on port 3000.

```bash
# 1. install (workspace root)
pnpm install

# 2. configure local env (KMS mock mode — no AWS creds needed)
cat > artifacts/api/.env <<EOF
PORT=3000
NODE_ENV=development
GENOSYNC_KMS_MOCK=1
AWS_REGION=us-east-1
GENOSYNC_KMS_KEY_ID=alias/genosync-userdata-local
EOF

cat > artifacts/web/.env <<EOF
PORT=5173
API_PORT=3000
VITE_API_BASE_URL=
VITE_GENOSYNC_CHAIN=base-sepolia
VITE_AURA_TOKEN_ADDRESS=
EOF

# 3. start the API (port 3000)
pnpm --filter @genosync/api run build
pnpm --filter @genosync/api run start &

# 4. start the web (port 5173, proxies /api → :3000)
pnpm --filter @genosync/web run dev
```

Open **http://localhost:5173**.

### Verify the local stack

```bash
# API health
curl http://localhost:5173/api/healthz
# {"status":"ok"}

# KMS-encrypt a bio payload (mock-mode, but envelope-shape-identical to real KMS)
curl -X POST http://localhost:5173/api/bio/encrypt \
  -H "Content-Type: application/json" \
  -d '{
        "walletAddress": "0xAbC1234567890000000000000000000000000001",
        "payload": { "hrv": 62, "strain": 14.2 }
      }'
# {"id":"bio_...","kmsKeyId":"MOCK_LOCAL_KEY","algorithm":"AES-256-GCM",...}

# Round-trip decrypt
curl -X POST http://localhost:5173/api/bio/<id>/decrypt \
  -H "Content-Type: application/json" \
  -d '{"walletAddress": "0xAbC1234567890000000000000000000000000001"}'
# {"payload":{"hrv":62,"strain":14.2},...}
```

`GENOSYNC_KMS_MOCK=1` produces an envelope with `kmsKeyId: "MOCK_LOCAL_KEY"` so production code can refuse mock envelopes — drop the flag in any environment that has real AWS credentials.

---

## Deploy to AWS

### One-time: provision the stack

```bash
aws cloudformation deploy \
  --template-file infra/aws/cloudformation-genosync.yml \
  --stack-name genosync \
  --capabilities CAPABILITY_NAMED_IAM \
  --region us-east-1
```

The template provisions:

| Resource | Purpose |
|---|---|
| `AWS::KMS::Key` (`alias/genosync-userdata`) | Customer-managed key, rotation enabled, scoped policy |
| `AWS::S3::Bucket` (private, OAC) | Vite build artifact storage |
| `AWS::CloudFront::Distribution` | TLS, edge cache, SPA fallback (`/index.html` for 403/404) |
| `AWS::ECR::Repository` | API image registry, `ScanOnPush: true` |
| `AWS::ECS::Cluster` | Fargate cluster |
| `AWS::IAM::Role` (`genosync-ecs-task`) | Allowed `kms:GenerateDataKey` / `Decrypt` on the genosync key only |
| `AWS::IAM::Role` (`genosync-ecs-execution`) | Standard ECR pull + CloudWatch logs |
| `AWS::Logs::LogGroup` (`/ecs/genosync-api`) | 14-day retention |

Capture the outputs:

```bash
aws cloudformation describe-stacks --stack-name genosync \
  --query "Stacks[0].Outputs" --region us-east-1
```

Set as env:

```bash
export AWS_REGION=us-east-1
export AWS_ACCOUNT_ID=<account-id>
export GENOSYNC_S3_BUCKET=<WebBucketName output>
export GENOSYNC_CF_DIST_ID=<CloudFrontDistribution output>
export GENOSYNC_ECR_REPO=genosync-api
export GENOSYNC_ECS_CLUSTER=genosync
export GENOSYNC_ECS_SERVICE=genosync-api
```

### Deploy the frontend

```bash
export VITE_API_BASE_URL=https://api.genosync.app
export VITE_GENOSYNC_CHAIN=base-sepolia        # or "base" for mainnet
export VITE_AURA_TOKEN_ADDRESS=0x...            # from contracts deploy

bash infra/aws/deploy-frontend.sh
```

The script:
1. `pnpm --filter @genosync/web run build`
2. `aws s3 sync` hashed assets with `Cache-Control: public,max-age=31536000,immutable`
3. Uploads `index.html` separately with `no-cache,no-store,must-revalidate`
4. Issues a CloudFront `/*` invalidation

### Deploy the API

```bash
bash infra/aws/deploy-api.sh
```

The script:
1. `aws ecr get-login-password | docker login`
2. `docker build -f artifacts/api/Dockerfile -t <repo>:<git-sha> -t <repo>:latest .`
3. `docker push` both tags
4. `aws ecs update-service --force-new-deployment`
5. `aws ecs wait services-stable`

First-time deploys also need a service registered against the task definition in [`infra/aws/ecs-task-definition.json`](infra/aws/ecs-task-definition.json) — replace `ACCOUNT_ID` / `REGION` placeholders, then `aws ecs register-task-definition --cli-input-json file://...` and `aws ecs create-service`.

### Deploy the smart contract

```bash
cd artifacts/contracts
cp .env.example .env
# fill in DEPLOYER_PRIVATE_KEY (fund with Base Sepolia faucet ETH)
# optional: BASESCAN_API_KEY for auto-verification

pnpm install
pnpm run deploy:base-sepolia    # or deploy:base for mainnet
```

Output:
```
Deploying AuraToken to baseSepolia (chainId 84532)
Deployer: 0x...
Balance:  0.05 ETH

AuraToken deployed: 0xABC...
BaseScan Sepolia: https://sepolia.basescan.org/address/0xABC...
```

Copy the address into `artifacts/web/.env` as `VITE_AURA_TOKEN_ADDRESS=0xABC...` and redeploy the frontend.

---

## Coinbase Smart Wallet (passkey login)

The LockScreen step 2 surfaces "Sign in with Passkey" as the recommended option:

```ts
// artifacts/web/src/lib/coinbase-smart-wallet.ts
const sdk = createCoinbaseWalletSDK({
  appName: 'GenoSync',
  appChainIds: [base.id, baseSepolia.id],
  preference: { options: 'smartWalletOnly' },   // forces smart-wallet creation,
                                                // not legacy EOA browser extension
});
```

User journey:

1. User taps **Sign in with Passkey**.
2. Coinbase Smart Wallet popup opens, prompts FaceID / TouchID via WebAuthn.
3. Smart-contract wallet is created (or restored) on **Base**, controlled by the device passkey — not a seed phrase.
4. Wallet address comes back via `eth_requestAccounts`; GenoSync advances to step 3 (wearable connect).
5. Future on-chain calls (`AuraToken.mint`) go through the same provider — gas-free if a paymaster is configured.

Why this matters for a health app: regular users churn at "write down these 12 words." A passkey is biometric and stays inside the device's secure enclave — non-exportable, phishing-resistant, recoverable per Apple/Google account.

---

## AWS KMS encryption — exact flow

```
artifacts/api/src/lib/kms.ts
─────────────────────────────────────────────────────────────────────────

  encryptBioPayloadSafe(plaintext, context)            decryptBioPayloadSafe(envelope, context)
    │                                                    │
    ├─ if GENOSYNC_KMS_MOCK=1:                          ├─ if envelope.kmsKeyId === "MOCK_LOCAL_KEY":
    │     local AES key (DEV ONLY)                       │     local AES decrypt (DEV ONLY)
    │                                                    │
    └─ else: encryptBioPayload                           └─ else: decryptBioPayload
         │                                                    │
         │  KMS.GenerateDataKey({                              │  KMS.Decrypt({
         │    KeyId: alias/genosync-userdata,                 │    CiphertextBlob: envelope.encryptedDataKey,
         │    KeySpec: "AES_256",                              │    EncryptionContext: { wallet, app }
         │    EncryptionContext: { wallet, app }               │  })
         │  })                                                 │
         │   ↓ Plaintext DEK + CiphertextBlob                  │   ↓ Plaintext DEK
         │                                                     │
         │  AES-256-GCM.encrypt(plaintext, DEK, iv=randomBytes(12))
         │   ↓ ciphertext, authTag                              AES-256-GCM.decrypt(...)
         │                                                       ↓ plaintext
         │  DEK.fill(0)        ← wipe from memory               │
         │                                                       │  DEK.fill(0)
         └─▶ envelope                                            └─▶ Buffer (caller decides what to do)
```

### Encrypted bio API

| Verb | Path | Purpose |
|---|---|---|
| `POST` | `/api/bio/encrypt` | KMS-encrypt a payload, return record id + envelope metadata |
| `GET` | `/api/bio/:id` | Inspect envelope (ciphertext truncated — proof it's encrypted) |
| `POST` | `/api/bio/:id/decrypt` | Wallet-gated decrypt; returns plaintext payload |
| `GET` | `/api/bio/by-wallet/:address` | List envelope records owned by a wallet |

**Sample request — encrypt:**

```http
POST /api/bio/encrypt
Content-Type: application/json

{
  "walletAddress": "0xAbC...",
  "payload": {
    "kind": "wellness-challenge",
    "challengeType": "hydration",
    "xpAwarded": 50,
    "completedAt": "2026-05-07T15:48:46.022Z"
  }
}
```

**Response:**

```json
{
  "id": "bio_movnv8ee_asqa85hj",
  "walletAddress": "0xabc...",
  "kmsKeyId": "alias/genosync-userdata",
  "algorithm": "AES-256-GCM",
  "encryptedAt": "2026-05-07T15:48:46.022Z",
  "ciphertextLength": 80
}
```

The Dashboard automatically posts to this endpoint after every wellness challenge — so every XP-earning event leaves both an on-chain mint **and** a KMS-encrypted off-chain record, correlated by the `mintWithReceipt(receiptId)` event.

---

## Multi-chain switch

`artifacts/web/src/lib/chains.ts` exports an `activeChain` derived from `VITE_GENOSYNC_CHAIN`:

| `VITE_GENOSYNC_CHAIN` | activeChain | Chain ID | Use |
|---|---|---|---|
| `base` | Base mainnet | 8453 | Production |
| `base-sepolia` *(default)* | Base Sepolia | 84532 | Demo / testnet |
| `flow` | Flow EVM Testnet | 545 | Legacy compatibility |

Every part of the stack reads `activeChain`:
- `aura-token.ts` builds the public + wallet client against it
- `coinbase-smart-wallet.ts` requests `wallet_switchEthereumChain` to it
- `PrivyProviderWrapper.tsx` sets `defaultChain` and `supportedChains`
- LockScreen + Dashboard chain badges render its `name`

---

## Smart contracts

`artifacts/contracts/contracts/AuraToken.sol` — ERC-20 minted on wellness completion. OpenZeppelin v5 `Ownable` + minter map.

```solidity
function mint(address to, uint256 amount) external onlyMinter {
    _mint(to, amount);
}

function mintWithReceipt(address to, uint256 amount, bytes32 receiptId) external onlyMinter {
    _mint(to, amount);
    emit BioReceiptMinted(to, amount, receiptId);   // pairs on-chain mint
                                                     // with KMS-encrypted off-chain record id
}
```

Hardhat config supports both `base` (8453) and `baseSepolia` (84532), with auto-verification on BaseScan when `BASESCAN_API_KEY` is set.

---

## Pitch lines

> **Security.** *GenoSync handles HIPAA-class data. Every off-chain payload is envelope-encrypted with AWS KMS before it ever touches a database. Even with full DB access, an attacker sees only ciphertext — they'd need to invoke our KMS key, and CloudTrail logs every call.*

> **Adoption.** *Healthcare apps fail at "write down these 12 words." GenoSync replaces that with a Coinbase Smart Wallet — FaceID or TouchID, no seed phrase, no extension. The wallet lives on Base, so transactions are sub-cent and gas-free with a paymaster.*

> **Trust.** *Every wellness event ends with two artifacts: an on-chain `mintWithReceipt` event on Base, and a KMS-encrypted bio record off-chain. The receipt id pairs them. You can prove an event happened without ever exposing what the event contained.*

---

## License

MIT License — see [LICENSE](LICENSE) for details.
