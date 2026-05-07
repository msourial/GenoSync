# Bioledger Local Deployment Guide

This guide covers deploying Bioledger locally for development.

## Quick Start

### Option 1: Using the Start Script (Recommended)

```bash
./scripts/start-local.sh
```

This will:
- Install dependencies
- Build the API
- Start the API server on port 3000
- Start the frontend on port 5173

### Option 2: Using Docker Compose

```bash
# Start all services
docker-compose up

# Or run in detached mode
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Option 3: Manual Start

**Terminal 1 - API:**
```bash
# Install dependencies
pnpm install

# Build shared libraries
pnpm run typecheck:libs

# Build API
cd artifacts/api
pnpm run build

# Set environment
export NODE_ENV=development
export PORT=3000
export CORS_ORIGIN="http://localhost:5173"

# Start API
node dist/index.mjs
```

**Terminal 2 - Frontend:**
```bash
cd artifacts/web
pnpm run dev
```

## Environment Variables

### API Server
| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `development` | Environment mode |
| `PORT` | `3000` | API server port |
| `DATABASE_URL` | - | PostgreSQL connection string (optional, uses in-memory if not set) |
| `CORS_ORIGIN` | `*` | Allowed CORS origins |

### Frontend
| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | `/api` | API base URL |

## Access Points

- **Frontend**: http://localhost:5173
- **API Server**: http://localhost:3000
- **Health Check**: http://localhost:3000/api/health

## Troubleshooting

### Port Already in Use
If ports 3000 or 5173 are in use, modify the PORT in the start script or use Docker.

### Dependencies Issues
```bash
# Clean and reinstall
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### Database Connection
Without `DATABASE_URL`, the API uses an in-memory store. For PostgreSQL:
```bash
# Local PostgreSQL
export DATABASE_URL="postgresql://user:password@localhost:5432/bioledger"
```

## Architecture

- **Frontend**: Vite + React + Tailwind CSS (port 5173)
- **Backend**: Express.js API (port 3000)
- **Database**: PostgreSQL with Drizzle ORM (optional, in-memory fallback available)
