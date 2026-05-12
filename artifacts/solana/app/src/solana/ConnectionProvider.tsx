import React, { createContext, useContext, useMemo } from 'react';
import { Connection, clusterApiUrl, Commitment } from '@solana/web3.js';

/**
 * GenoSync Solana Connection Provider
 * 
 * Provides a Solana RPC connection optimized for mobile.
 * Uses QuickNode or Helius for better reliability than public RPC.
 */

type SolanaCluster = 'mainnet-beta' | 'testnet' | 'devnet' | 'localnet';

interface ConnectionContextState {
  connection: Connection;
  cluster: SolanaCluster;
  isDevnet: boolean;
  isMainnet: boolean;
}

const ConnectionContext = createContext<ConnectionContextState>({
  connection: new Connection(clusterApiUrl('devnet')),
  cluster: 'devnet',
  isDevnet: true,
  isMainnet: false,
});

// RPC endpoints - prefer private endpoints for production
const RPC_ENDPOINTS: Record<SolanaCluster, string> = {
  'mainnet-beta': 
    process.env.QUICKNODE_MAINNET_URL || 
    process.env.HELIUS_MAINNET_URL || 
    clusterApiUrl('mainnet-beta'),
  'testnet': clusterApiUrl('testnet'),
  'devnet': 
    process.env.QUICKNODE_DEVNET_URL || 
    process.env.HELIUS_DEVNET_URL || 
    clusterApiUrl('devnet'),
  'localnet': 'http://localhost:8899',
};

interface ConnectionProviderProps {
  children: React.ReactNode;
  cluster?: SolanaCluster;
  commitment?: Commitment;
}

export const ConnectionProvider: React.FC<ConnectionProviderProps> = ({
  children,
  cluster = 'devnet',
  commitment = 'confirmed',
}) => {
  const connection = useMemo(() => {
    const endpoint = RPC_ENDPOINTS[cluster];
    return new Connection(endpoint, {
      commitment,
      wsEndpoint: endpoint.replace('https', 'wss'),
    });
  }, [cluster, commitment]);

  const value = useMemo(
    () => ({
      connection,
      cluster,
      isDevnet: cluster === 'devnet',
      isMainnet: cluster === 'mainnet-beta',
    }),
    [connection, cluster]
  );

  return (
    <ConnectionContext.Provider value={value}>
      {children}
    </ConnectionContext.Provider>
  );
};

export const useConnection = () => useContext(ConnectionContext);

/**
 * Get explorer URL for a transaction or account
 */
export function getExplorerUrl(
  cluster: SolanaCluster,
  address: string,
  type: 'tx' | 'account' | 'token' = 'account'
): string {
  const baseUrl = 'https://explorer.solana.com';
  const clusterParam = cluster === 'mainnet-beta' ? '' : `?cluster=${cluster}`;
  
  switch (type) {
    case 'tx':
      return `${baseUrl}/tx/${address}${clusterParam}`;
    case 'token':
      return `${baseUrl}/address/${address}${clusterParam}`;
    default:
      return `${baseUrl}/address/${address}${clusterParam}`;
  }
}

/**
 * Get Solscan URL (alternative explorer)
 */
export function getSolscanUrl(
  cluster: SolanaCluster,
  address: string,
  type: 'tx' | 'account' | 'token' = 'account'
): string {
  const clusterSubdomain = cluster === 'mainnet-beta' ? '' : `${cluster}.`;
  const baseUrl = `https://${clusterSubdomain}solscan.io`;
  
  switch (type) {
    case 'tx':
      return `${baseUrl}/tx/${address}`;
    case 'token':
      return `${baseUrl}/token/${address}`;
    default:
      return `${baseUrl}/account/${address}`;
  }
}
