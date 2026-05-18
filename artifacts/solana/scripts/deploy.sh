#!/bin/bash

# GenoSync Solana Program Deployment Script
# Deploys all programs: Staking, cNFT, and Governance

set -e

echo "🚀 GenoSync Solana Deployment"
echo "=============================="

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Configuration
CLUSTER="${CLUSTER:-devnet}"  # devnet, mainnet-beta, or localnet
KEYPAIR="${KEYPAIR:-~/.config/solana/id.json}"

# Check prerequisites
echo -e "${BLUE}Checking prerequisites...${NC}"

if ! command -v solana &> /dev/null; then
    echo -e "${RED}❌ Solana CLI not found. Install from https://docs.solana.com/cli/install${NC}"
    exit 1
fi

if ! command -v anchor &> /dev/null; then
    echo -e "${RED}❌ Anchor not found. Install from https://www.anchor-lang.com/docs/installation${NC}"
    exit 1
fi

# Set Solana config
echo -e "${BLUE}Setting cluster to ${CLUSTER}...${NC}"
solana config set --url ${CLUSTER}

# Check balance
echo -e "${BLUE}Checking wallet balance...${NC}"
BALANCE=$(solana balance)
echo "Balance: ${BALANCE} SOL"

if [[ $(echo "${BALANCE} < 2" | bc -l) -eq 1 ]]; then
    echo -e "${YELLOW}⚠️  Low balance. Request airdrop? (y/n)${NC}"
    read -r response
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        solana airdrop 2
    fi
fi

echo ""
echo -e "${GREEN}📦 Deploying Programs${NC}"
echo "======================"

# 1. Deploy Staking Program
echo ""
echo -e "${BLUE}1. Deploying Staking Program...${NC}"
cd artifacts/solana/programs/staking

anchor build
echo -e "${GREEN}✓ Staking program built${NC}"

anchor deploy --provider.cluster ${CLUSTER} 2>&1 | tee deploy.log
STAKING_PROGRAM_ID=$(grep "Program Id:" deploy.log | awk '{print $3}')
echo -e "${GREEN}✓ Staking Program deployed: ${STAKING_PROGRAM_ID}${NC}"

cd ../../../../../

# 2. Deploy cNFT Program
echo ""
echo -e "${BLUE}2. Deploying cNFT Program...${NC}"
cd artifacts/solana/programs/cnft

anchor build
echo -e "${GREEN}✓ cNFT program built${NC}"

anchor deploy --provider.cluster ${CLUSTER} 2>&1 | tee deploy.log
CNFT_PROGRAM_ID=$(grep "Program Id:" deploy.log | awk '{print $3}')
echo -e "${GREEN}✓ cNFT Program deployed: ${CNFT_PROGRAM_ID}${NC}"

cd ../../../../../

# 3. Deploy Governance Program
echo ""
echo -e "${BLUE}3. Deploying Governance Program...${NC}"
cd artifacts/solana/programs/governance

anchor build
echo -e "${GREEN}✓ Governance program built${NC}"

anchor deploy --provider.cluster ${CLUSTER} 2>&1 | tee deploy.log
GOVERNANCE_PROGRAM_ID=$(grep "Program Id:" deploy.log | awk '{print $3}')
echo -e "${GREEN}✓ Governance Program deployed: ${GOVERNANCE_PROGRAM_ID}${NC}"

cd ../../../../../

# 4. Create AURA Token
echo ""
echo -e "${BLUE}4. Creating AURA Token...${NC}"

AURA_TOKEN=$(spl-token create-token --decimals 9 --fee-payer ${KEYPAIR} 2>&1 | grep "Creating token" | awk '{print $3}')
if [ -z "$AURA_TOKEN" ]; then
    echo -e "${YELLOW}Token may already exist or creation failed${NC}"
else
    echo -e "${GREEN}✓ AURA Token created: ${AURA_TOKEN}${NC}"
    
    # Create token account
    spl-token create-account ${AURA_TOKEN}
    
    # Mint initial supply (1 million AURA)
    spl-token mint ${AURA_TOKEN} 1000000000000000
    echo -e "${GREEN}✓ Minted 1,000,000 AURA tokens${NC}"
fi

echo ""
echo -e "${GREEN}🎉 Deployment Complete!${NC}"
echo "========================"
echo ""
echo "Program IDs:"
echo "  Staking:    ${STAKING_PROGRAM_ID:-"Run 'solana address -k target/deploy/staking-keypair.json'"}"
echo "  cNFT:       ${CNFT_PROGRAM_ID:-"Run 'solana address -k target/deploy/cnft-keypair.json'"}"
echo "  Governance: ${GOVERNANCE_PROGRAM_ID:-"Run 'solana address -k target/deploy/governance-keypair.json'"}"
echo "  AURA Token: ${AURA_TOKEN:-"Check with 'spl-token accounts'"}"
echo ""
echo "Next steps:"
echo "  1. Save these addresses in your .env file"
echo "  2. Initialize staking pool: anchor run init-staking"
echo "  3. Initialize DAO: anchor run init-dao"
echo "  4. Update SDK constants with deployed addresses"
echo ""

# Save deployment info
cat > artifacts/solana/deployment-${CLUSTER}.json << EOF
{
  "cluster": "${CLUSTER}",
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "programs": {
    "staking": "${STAKING_PROGRAM_ID}",
    "cnft": "${CNFT_PROGRAM_ID}",
    "governance": "${GOVERNANCE_PROGRAM_ID}"
  },
  "tokens": {
    "aura": "${AURA_TOKEN}"
  }
}
EOF

echo -e "${GREEN}✓ Deployment info saved to artifacts/solana/deployment-${CLUSTER}.json${NC}"
