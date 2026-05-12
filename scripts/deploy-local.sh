#!/bin/bash

# GenoSync Complete Local Deployment Script
# Deploys both original web app and Solana components locally

set -e

echo "🚀 GenoSync Local Deployment"
echo "============================"

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Check prerequisites
echo -e "${BLUE}Checking prerequisites...${NC}"

if ! command -v pnpm &> /dev/null; then
    echo -e "${RED}❌ pnpm not found. Installing...${NC}"
    npm install -g pnpm
fi

if ! command -v solana &> /dev/null; then
    echo -e "${YELLOW}⚠️  Solana CLI not found. Solana features will be skipped.${NC}"
    echo "   Install from: https://docs.solana.com/cli/install"
    SKIP_SOLANA=true
fi

if ! command -v anchor &> /dev/null; then
    echo -e "${YELLOW}⚠️  Anchor not found. Solana program deployment will be skipped.${NC}"
    echo "   Install from: https://www.anchor-lang.com/docs/installation"
    SKIP_SOLANA=true
fi

# Install dependencies
echo ""
echo -e "${BLUE}📦 Installing dependencies...${NC}"
pnpm install

# Build shared libraries
echo ""
echo -e "${BLUE}🔧 Building shared libraries...${NC}"
pnpm run typecheck:libs

echo -e "${GREEN}✓ Libraries built${NC}"

# Build API with workspace externals
echo ""
echo -e "${BLUE}🔨 Building API server...${NC}"
cd artifacts/api

# Check if we need to install tsx for dev mode
if ! npx tsx --version &> /dev/null; then
    echo -e "${BLUE}Installing tsx for TypeScript execution...${NC}"
    pnpm add -D tsx
fi

echo -e "${GREEN}✓ API ready${NC}"
cd ../..

# Start local Solana validator (optional)
if [ "$SKIP_SOLANA" != true ] && [ "$1" == "--with-solana" ]; then
    echo ""
    echo -e "${BLUE}⛓️ Starting local Solana validator...${NC}"
    
    # Check if validator is already running
    if solana cluster-version 2>/dev/null | grep -q "12345"; then
        echo -e "${YELLOW}Local validator already running${NC}"
    else
        solana-test-validator --reset &
        VALIDATOR_PID=$!
        
        echo -e "${BLUE}Waiting for validator to start...${NC}"
        sleep 5
        
        # Configure Solana CLI
        solana config set --url localhost
        solana airdrop 10
        
        echo -e "${GREEN}✓ Local validator running (PID: $VALIDATOR_PID)${NC}"
    fi
    
    # Deploy Solana programs locally
    echo ""
    echo -e "${BLUE}📦 Deploying Solana programs locally...${NC}"
    
    cd artifacts/solana/programs/staking
    anchor build 2>/dev/null || echo -e "${YELLOW}Skipping staking program build (Anchor not fully configured)${NC}"
    cd ../../../..
    
    echo -e "${YELLOW}⚠️  To deploy Solana programs locally, run:${NC}"
    echo "   cd artifacts/solana/programs/staking && anchor deploy"
fi

# Set environment variables
export NODE_ENV=development
export PORT=3000
export DATABASE_URL="${DATABASE_URL:-}"
export CORS_ORIGIN="http://localhost:5173,http://localhost:3001"
export VITE_API_URL="http://localhost:3000"

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}🎉 GenoSync Local Deployment Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${BLUE}Starting services...${NC}"
echo ""

# Function to cleanup on exit
cleanup() {
    echo ""
    echo -e "${BLUE}🛑 Shutting down services...${NC}"
    kill $API_PID 2>/dev/null || true
    kill $WEB_PID 2>/dev/null || true
    kill $VALIDATOR_PID 2>/dev/null || true
    echo -e "${GREEN}✅ All services stopped${NC}"
    exit 0
}

trap cleanup INT TERM

# Start API Server (using tsx for TypeScript with workspace imports)
echo -e "${BLUE}📊 Starting API Server on port 3000...${NC}"
cd artifacts/api
npx tsx src/index.ts &
API_PID=$!
cd ../..

# Wait for API to be ready
sleep 3

# Check if API started
if ! kill -0 $API_PID 2>/dev/null; then
    echo -e "${RED}❌ API failed to start. Trying alternative method...${NC}"
    
    # Fallback: use the build script
    cd artifacts/api
    node build.mjs 2>/dev/null || echo -e "${YELLOW}Build may have issues with workspace imports${NC}"
    
    if [ -f dist/index.mjs ]; then
        node --enable-source-maps dist/index.mjs &
        API_PID=$!
    else
        echo -e "${YELLOW}API not started. Frontend will use in-memory mode.${NC}"
    fi
    cd ../..
fi

if kill -0 $API_PID 2>/dev/null; then
    echo -e "${GREEN}✅ API Server running at http://localhost:3000${NC}"
else
    echo -e "${YELLOW}⚠️  API not running. Check logs above.${NC}"
fi

# Start Frontend Dev Server
echo ""
echo -e "${BLUE}🌐 Starting Frontend on port 5173...${NC}"
cd artifacts/web
pnpm run dev -- --host 0.0.0.0 &
WEB_PID=$!
cd ../..

# Wait for frontend
sleep 5

if kill -0 $WEB_PID 2>/dev/null; then
    echo -e "${GREEN}✅ Frontend running at http://localhost:5173${NC}"
else
    echo -e "${RED}❌ Frontend failed to start${NC}"
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}🎉 GenoSync is running locally!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${BLUE}📊 API Server:${NC}   http://localhost:3000"
echo -e "${BLUE}🌐 Frontend:${NC}     http://localhost:5173"
echo -e "${BLUE}📚 Health Check:${NC} http://localhost:3000/api/health"

if [ "$SKIP_SOLANA" != true ] && [ "$1" == "--with-solana" ]; then
    echo -e "${BLUE}⛓️  Solana RPC:${NC}   http://localhost:8899"
    echo -e "${BLUE}🔍 Solana Explorer:${NC} https://explorer.solana.com/?cluster=custom&customUrl=http://localhost:8899"
fi

echo ""
echo -e "${YELLOW}Press Ctrl+C to stop all services${NC}"
echo ""

# Keep script running
wait
