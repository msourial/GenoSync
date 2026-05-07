# GenoSync — AWS deployment

End-to-end on AWS. No Vercel, no Heroku.

## Architecture

```
            ┌──────────────────────────────────────────────────┐
            │                Browser (Coinbase Smart Wallet)    │
            │       Passkey login — no seed phrases for users  │
            └──────────────────────────┬───────────────────────┘
                                       │ HTTPS
                  ┌────────────────────▼─────────────────────┐
                  │  CloudFront (TLS, edge cache, SPA route) │
                  │  ── origin ──▶  S3 bucket (Vite build)   │
                  └────────────────────┬─────────────────────┘
                                       │  /api/*
                  ┌────────────────────▼─────────────────────┐
                  │  ALB ──▶ ECS Fargate (GenoSync API)     │
                  │  Image from ECR (genosync-api)          │
                  └─────┬────────────────────────────────┬───┘
                        │                                │
       ┌────────────────▼──────────────┐  ┌──────────────▼──────────────┐
       │  AWS KMS  alias/genosync-    │  │  Base (Coinbase L2)         │
       │  userdata — envelope encrypts │  │  AuraToken ERC-20           │
       │  every off-chain bio payload  │  │  Bio receipts on-chain      │
       └───────────────────────────────┘  └─────────────────────────────┘
```

## One-time setup

```bash
# 1. Provision the stack
aws cloudformation deploy \
  --template-file infra/aws/cloudformation-genosync.yml \
  --stack-name genosync \
  --capabilities CAPABILITY_NAMED_IAM \
  --region us-east-1

# 2. Capture outputs
aws cloudformation describe-stacks --stack-name genosync \
  --query "Stacks[0].Outputs" --region us-east-1
```

Save the outputs as env vars:

```bash
export AWS_REGION=us-east-1
export AWS_ACCOUNT_ID=<your-account-id>
export GENOSYNC_S3_BUCKET=<WebBucketName output>
export GENOSYNC_CF_DIST_ID=<CloudFrontDistribution output>
export GENOSYNC_ECR_REPO=genosync-api
export GENOSYNC_ECS_CLUSTER=genosync
export GENOSYNC_ECS_SERVICE=genosync-api
export GENOSYNC_KMS_KEY_ID=alias/genosync-userdata
```

## Deploy the frontend (S3 + CloudFront)

```bash
export VITE_API_BASE_URL=https://api.genosync.app
export VITE_GENOSYNC_CHAIN=base-sepolia          # or "base" for mainnet
export VITE_AURA_TOKEN_ADDRESS=0x...              # output of contracts deploy
bash infra/aws/deploy-frontend.sh
```

What the script does:
1. `pnpm --filter @genosync/web run build`
2. `aws s3 sync` hashed assets with `max-age=31536000,immutable`
3. Uploads `index.html` with `no-cache`
4. Issues a CloudFront `/*` invalidation

## Deploy the API (ECR + ECS Fargate)

```bash
bash infra/aws/deploy-api.sh
```

What the script does:
1. `aws ecr get-login-password | docker login`
2. `docker build` from `artifacts/api/Dockerfile`
3. `docker push` `:<git-sha>` and `:latest`
4. `aws ecs update-service --force-new-deployment`
5. `aws ecs wait services-stable`

The first deploy needs an ECS service + task definition — register the task definition from `infra/aws/ecs-task-definition.json` (replace `ACCOUNT_ID` / `REGION`) and create a service pointing at it.

## KMS encryption flow

- The API task role (`genosync-ecs-task`) has `kms:GenerateDataKey` and `kms:Decrypt` on the `alias/genosync-userdata` key only.
- `POST /api/bio/encrypt` calls `kms:GenerateDataKey` to mint a 256-bit DEK, encrypts the payload locally with AES-256-GCM, persists `{ ciphertext, iv, authTag, encryptedDataKey }`, and zeroes the plaintext DEK from memory.
- `POST /api/bio/:id/decrypt` calls `kms:Decrypt` on the wrapped DEK (with the same `EncryptionContext: { wallet, app: "genosync" }`) and decrypts locally.
- Plaintext bio data **never lands at rest** — only the encrypted envelope does. The KMS key cannot be exported.

For local dev without AWS credentials, set `GENOSYNC_KMS_MOCK=1` to use an in-process AES key (clearly marked `MOCK_LOCAL_KEY` in the envelope so production code can refuse it).

## Pitch line

> *"User health/bio data is envelope-encrypted via AWS KMS before it ever touches disk. Even with full DB access, an attacker sees only ciphertext — they'd need to invoke our KMS key to decrypt, and CloudTrail logs every call."*
