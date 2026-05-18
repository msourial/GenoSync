#!/bin/bash
set -e

# Solana deployment script
CLUSTER=${1:-devnet}

echo "Deploying GenoSync programs to $CLUSTER..."

cd artifacts/solana/programs/staking
anchor build
anchor deploy --provider.cluster $CLUSTER

echo "Deployment complete."
