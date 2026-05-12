# GenoSync Local Deployment

Quick start guide for running GenoSync locally.

## Option 1: Quick Deploy Script (Recommended)

```bash
# Basic deployment (API + Frontend)
./scripts/deploy-local.sh

# With local Solana validator
./scripts/deploy-local.sh --with-solana
```

## Option 2: Docker Compose

```bash
# Start all services
docker-compose up

# Run in background
docker-compose up -d

# View logs
docker-compose logs -f

# Stop
docker-compose down
```

## Option 3: Manual (Development Mode)

**Terminal 1 - API:**
```bash
cd artifacts/api
export NODE_ENV=development
export PORT=3000
export CORS_ORIGIN="http://localhost:5173"
npx tsx src/index.ts
```

**Terminal 2 - Frontend:**
```bash
cd artifacts/web
pnpm run dev
```

## Access Points

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| API | http://localhost:3000 |
| Health Check | http://localhost:3000/api/health |

With `--with-solana`:
| Service | URL |
|---------|-----|
| Solana RPC | http://localhost:8899 |
| Solana Explorer | https://explorer.solana.com/?cluster=custom&customUrl=http://localhost:8899 |

## Environment Variables

Create a `.env` file in the root:

```bash
# API
NODE_ENV=development
PORT=3000
DATABASE_URL=""  # Optional, uses in-memory if not set
CORS_ORIGIN="http://localhost:5173"

# Frontend
VITE_API_URL="http://localhost:3000"
VITE_BIOLEDGER_CHAIN="local"

# Solana (optional)
SOLANA_RPC_URL="http://localhost:8899"
ANCHOR_WALLET="~/.config/solana/id.json"
```

## Prerequisites

- **Node.js** 18+ and **pnpm**
- **Solana CLI** (optional, for local validator)
- **Anchor** (optional, for program deployment)
- **Docker** (optional, for Docker Compose)

## Troubleshooting

### Port already in use
```bash
# Find and kill process on port 3000
lsof -ti:3000 | xargs kill -9
lsof -ti:5173 | xargs kill -9
```

### Dependencies issues
```bash
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### API build fails
The API uses workspace imports. Use `tsx` for development:
```bash
cd artifacts/api
npx tsx src/index.ts
```

### Solana validator not starting
```bash
# Kill existing validator
pkill solana-test-validator

# Start fresh
solana-test-validator --reset
```

## Features Available Locally

✅ Wellness companion with AI coaching  
✅ Computer vision (MediaPipe) via webcam  
✅ Session grading (S/A/B/C/D)  
✅ In-memory data storage (no DB needed)  
✅ React frontend with Vite HMR  

With `--with-solana`:
✅ Local Solana validator  
✅ Deploy programs locally  
✅ Test staking and NFT minting  

## Mobile Testing

Access from phone on same network:
```
http://<your-computer-ip>:5173
```

Find your IP:
```bash
# macOS
ipconfig getifaddr en0

# Linux
hostname -I | awk '{print $1}'
```
