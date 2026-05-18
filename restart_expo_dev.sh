#!/bin/bash
cd /Users/m/Documents/Per/easya2026/GenoSync-main/artifacts/solana/app
# Kill any existing Metro processes
pkill -f "expo start" 2>/dev/null || true
sleep 2
# Start with development client
npx expo start --android --dev-client
