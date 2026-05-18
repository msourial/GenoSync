#!/bin/bash

# Simple GenoSync Local Deployment
# Option 1: Docker Compose (Recommended)
# Option 2: Manual with tsx

set -e

echo "🚀 GenoSync Local Deployment"
echo "==========================="
echo ""

# Check if Docker is available
if command -v docker &> /dev/null && command -v docker-compose &> /dev/null; then
    echo "Option 1: Docker Compose (Recommended)"
    echo "   docker-compose -f docker-compose.simple.yml up --build"
    echo ""
    echo "Option 2: Manual (requires pnpm)"
    echo "   ./start-manual.sh"
    echo ""
    
    read -p "Choose option (1/2): " choice
    
    if [ "$choice" == "1" ]; then
        echo "Starting with Docker Compose..."
        docker-compose -f docker-compose.simple.yml up --build
        exit 0
    fi
fi

# Manual mode
echo "Starting in manual mode..."
echo ""

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    pnpm install
fi

# Build libraries
echo "🔧 Building libraries..."
pnpm run typecheck:libs

# Set environment
export NODE_ENV=development
export PORT=3000
export CORS_ORIGIN="http://localhost:5173"

# Function to cleanup
cleanup() {
    echo ""
    echo "🛑 Stopping services..."
    kill $API_PID 2>/dev/null || true
    kill $WEB_PID 2>/dev/null || true
    echo "✅ Stopped"
    exit 0
}
trap cleanup INT TERM

# Start API
echo "📊 Starting API on http://localhost:3000..."
cd artifacts/api
npx tsx src/index.ts &
API_PID=$!
cd ../..
sleep 3

# Start Frontend
echo "🌐 Starting Frontend on http://localhost:5173..."
cd artifacts/web
pnpm run dev -- --host 0.0.0.0 &
WEB_PID=$!
cd ../..
sleep 5

echo ""
echo "========================================"
echo "🎉 GenoSync is running!"
echo "========================================"
echo ""
echo "📊 API:    http://localhost:3000"
echo "🌐 Web:    http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop"
echo ""

wait
