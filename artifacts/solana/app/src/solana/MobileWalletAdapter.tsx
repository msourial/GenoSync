import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  transact,
  Web3MobileWallet,
} from '@solana-mobile/mobile-wallet-adapter-protocol-web3js';
import { PublicKey, Transaction, VersionedTransaction } from '@solana/web3.js';
import { Buffer } from 'buffer';
import bs58 from 'bs58';

/**
 * GenoSync Mobile Wallet Adapter
 * 
 * Integrates with Solana Mobile Stack (SMS) for Saga/Seeker phones.
 * Features:
 * - Seed Vault integration (secure enclave)
 * - Biometric authentication (fingerprint)
 * - Mobile Wallet Adapter protocol
 * - Support for Phantom, Solflare, and Seed Vault
 */

export interface Authorization {
  accounts: { address: string; publicKey: PublicKey }[];
  authToken: string;
  selectedAccount: { address: string; publicKey: PublicKey };
}

interface MobileWalletContextState {
  authorization: Authorization | null;
  walletPublicKey: PublicKey | null;
  walletAddress: string | null;
  isConnecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  signMessage: (message: Uint8Array) => Promise<Uint8Array>;
  signTransaction: (transaction: Transaction | VersionedTransaction) => Promise<Transaction | VersionedTransaction>;
  signAllTransactions: (transactions: (Transaction | VersionedTransaction)[]) => Promise<(Transaction | VersionedTransaction)[]>;
}

const MobileWalletContext = createContext<MobileWalletContextState>({
  authorization: null,
  walletPublicKey: null,
  walletAddress: null,
  isConnecting: false,
  connect: async () => {},
  disconnect: async () => {},
  signMessage: async () => new Uint8Array(),
  signTransaction: async (tx) => tx,
  signAllTransactions: async (txs) => txs,
});

export const MobileWalletAdapterProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [authorization, setAuthorization] = useState<Authorization | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  // Derive wallet info from authorization
  const walletPublicKey = useMemo(() => {
    return authorization?.selectedAccount?.publicKey ?? null;
  }, [authorization]);

  const walletAddress = useMemo(() => {
    return authorization?.selectedAccount?.address ?? null;
  }, [authorization]);

  // Connect to mobile wallet (Seed Vault, Phantom, or Solflare)
  const connect = useCallback(async () => {
    setIsConnecting(true);
    try {
      const authResult = await transact(async (wallet: Web3MobileWallet) => {
        // Authorize the app
        const appIdentity = {
          name: 'GenoSync',
          uri: 'https://genosync.app',
          icon: '/icon.png',
        };
        const authorizationResult = await wallet.authorize({
          cluster: 'mainnet-beta',
          identity: appIdentity,
        });

        return authorizationResult;
      });

      // MWA v2 returns acc.address as a base64-encoded pubkey string (not base58).
      // Decode base64 → 32-byte pubkey → PublicKey, then re-derive a base58 address
      // for uniform downstream use.
      const accounts = authResult.accounts.map((acc) => {
        const pubkeyBytes = Buffer.from(acc.address, 'base64');
        const publicKey = new PublicKey(pubkeyBytes);
        return {
          address: publicKey.toBase58(),
          publicKey,
        };
      });

      const authorization: Authorization = {
        accounts,
        authToken: authResult.auth_token,
        selectedAccount: accounts[0],
      };

      setAuthorization(authorization);
      console.log('[MobileWallet] Connected:', accounts[0].address);
    } catch (error) {
      console.error('[MobileWallet] Connection failed:', error);
      throw error;
    } finally {
      setIsConnecting(false);
    }
  }, []);

  // Disconnect from wallet
  const disconnect = useCallback(async () => {
    if (!authorization) return;

    // Best-effort: ask the wallet to revoke the auth token. This MWA
    // round-trip can fail (wallet unavailable, session dropped, user
    // dismisses the wallet) — that must NOT block the local disconnect,
    // which is the user's actual intent. So we always clear local state.
    try {
      await transact(async (wallet: Web3MobileWallet) => {
        await wallet.deauthorize({ auth_token: authorization.authToken });
      });
    } catch (error) {
      console.warn('[MobileWallet] deauthorize skipped (non-fatal):', error);
    }

    setAuthorization(null);
    console.log('[MobileWallet] Disconnected');
  }, [authorization]);

  // Sign a message (for wellness receipt verification)
  const signMessage = useCallback(
    async (message: Uint8Array): Promise<Uint8Array> => {
      if (!authorization) {
        throw new Error('Not connected to wallet');
      }

      return await transact(async (wallet: Web3MobileWallet) => {
        const result = await wallet.signMessages({
          addresses: [authorization.selectedAccount.address],
          payloads: [message],
        });

        return result[0];
      });
    },
    [authorization]
  );

  // Sign a single transaction
  const signTransaction = useCallback(
    async (transaction: Transaction | VersionedTransaction) => {
      if (!authorization) {
        throw new Error('Not connected to wallet');
      }

      return await transact(async (wallet: Web3MobileWallet) => {
        const result = await wallet.signTransactions({
          transactions: [transaction],
        });

        return result[0];
      });
    },
    [authorization]
  );

  // Sign multiple transactions
  const signAllTransactions = useCallback(
    async (transactions: (Transaction | VersionedTransaction)[]) => {
      if (!authorization) {
        throw new Error('Not connected to wallet');
      }

      return await transact(async (wallet: Web3MobileWallet) => {
        return await wallet.signTransactions({
          transactions,
        });
      });
    },
    [authorization]
  );

  // Reconnect on app start if previous session exists
  useEffect(() => {
    // Mobile Wallet Adapter handles reconnection automatically
    // when the user returns to the app
  }, []);

  const value = useMemo(
    () => ({
      authorization,
      walletPublicKey,
      walletAddress,
      isConnecting,
      connect,
      disconnect,
      signMessage,
      signTransaction,
      signAllTransactions,
    }),
    [
      authorization,
      walletPublicKey,
      walletAddress,
      isConnecting,
      connect,
      disconnect,
      signMessage,
      signTransaction,
      signAllTransactions,
    ]
  );

  return (
    <MobileWalletContext.Provider value={value}>
      {children}
    </MobileWalletContext.Provider>
  );
};

export const useMobileWallet = () => useContext(MobileWalletContext);

/**
 * Sign a wellness receipt using the mobile wallet
 * Returns base58-encoded signature
 */
export async function signWellnessReceipt(
  wallet: MobileWalletContextState,
  receiptData: object
): Promise<string> {
  const message = JSON.stringify(receiptData);
  const messageBytes = new TextEncoder().encode(message);
  
  const signature = await wallet.signMessage(messageBytes);
  return bs58.encode(signature);
}

/**
 * Check if running on Solana Phone (Saga/Seeker)
 */
export function isSolanaPhone(): boolean {
  // Check for Seed Vault capability
  return typeof navigator !== 'undefined' && 
    'solana' in navigator &&
    // @ts-ignore
    navigator.solana?.isPhantom !== true;
}
