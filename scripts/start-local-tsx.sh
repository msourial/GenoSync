#!/bin/bash

# GenoSync Local Development Deployment Script using tsx
# This script starts the backend API and frontend locally using tsx for TypeScript execution

set -e

echo "🧬 Starting GenoSync Local Development Environment..."

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
    echo "❌ pnpm is not installed. Please install it first:"
    echo "   npm install -g pnpm"
    exit 1
fi

# Install tsx globally if not present
if ! command -v tsx &> /dev/null; then
    echo -e "${BLUE}📦 Installing tsx for TypeScript execution...${NC}"
    npm install -g tsx
fi

# Install dependencies if needed
echo -e "${BLUE}📦 Installing dependencies...${NC}"
pnpm install

# Set environment variables for API
export NODE_ENV=development
export PORT=3000
export DATABASE_URL="${DATABASE_URL:-}"
export CORS_ORIGIN="http://localhost:5173,http://localhost:3001"

# Start API in background using tsx (handles TypeScript and workspace imports)
echo -e "${GREEN}🚀 Starting API server on port 3000...${NC}"
cd artifacts/api

# Create a temporary package.json resolution script
cat > tsx-loader.mjs << 'EOF'
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { register } from 'node:module';

// Register tsx
const require = createRequire(import.meta.url);
const tsxPath = require.resolve('tsx/esm/api');
const { tsx } = await import(tsxPath);

// Start the server
tsx.import('./src/index.ts', import.meta.url);
EOF

npx tsx src/index.ts &
API_PID=$!
cd ../..

# Wait for API to start
sleep 3

# Check if API is running
if kill -0 $API_PID 2>/dev/null; then
    echo -e "${GREEN}✅ API server is running on http://localhost:3000${NC}"
else
    echo -e "${YELLOW}⚠️  API server failed to start. Check logs above.${NC}"
    exit 1
fi

# Start frontend
echo -e "${GREEN}🌐 Starting frontend development server...${NC}"
cd artifacts/web
pnpm run dev &
WEB_PID=$!
cd ../..

# Wait for frontend to start
sleep 5

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}🎉 GenoSync is running locally!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${BLUE}📊 API Server:${NC} http://localhost:3000"
echo -e "${BLUE}🌐 Frontend:${NC}   http://localhost:5173"
echo -e "${BLUE}📚 Health Check:${NC} http://localhost:3000/api/health"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"
echo ""

# Handle shutdown
function cleanup() {
    echo ""
    echo -e "${BLUE}🛑 Shutting down services...${NC}"
    kill $WEB_PID 2>/dev/null || true
    kill $API_PID 2>/dev/null || true
    rm -f artifacts/api/tsx-loader.mjs
    echo -e "${GREEN}✅ All services stopped${NC}"
    exit 0
}

trap cleanup INT TERM

# Keep script running
wait
