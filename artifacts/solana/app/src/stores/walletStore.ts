import { create } from 'zustand';

/**
 * Solana Wallet Store
 * 
 * Tracks wallet state, AURA balance, and connection status.
 * Integrates with MobileWalletAdapter for Solana Mobile Stack.
 */

interface WalletState {
  walletAddress: string | null;
  auraBalance: number;
  isConnected: boolean;
  isConnecting: boolean;
  isSolanaPhone: boolean;
  
  // Actions
  setWalletAddress: (address: string | null) => void;
  setAuraBalance: (balance: number) => void;
  setConnected: (connected: boolean) => void;
  setConnecting: (connecting: boolean) => void;
  setIsSolanaPhone: (isPhone: boolean) => void;
  disconnect: () => void;
}

export const useWalletStore = create<WalletState>((set) => ({
  walletAddress: null,
  auraBalance: 0,
  isConnected: false,
  isConnecting: false,
  isSolanaPhone: false,

  setWalletAddress: (address) => set({ walletAddress: address, isConnected: !!address }),
  setAuraBalance: (balance) => set({ auraBalance: balance }),
  setConnected: (connected) => set({ isConnected: connected }),
  setConnecting: (connecting) => set({ isConnecting: connecting }),
  setIsSolanaPhone: (isPhone) => set({ isSolanaPhone: isPhone }),
  
  disconnect: () => set({
    walletAddress: null,
    auraBalance: 0,
    isConnected: false,
    isConnecting: false,
  }),
}));
