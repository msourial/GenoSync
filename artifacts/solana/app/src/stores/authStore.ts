import { create } from 'zustand';

/**
 * GenoSync Auth Store
 * 
 * Manages authentication state for mobile app
 */

interface AuthState {
  isAuthenticated: boolean;
  walletAddress: string | null;
  nullifierHash: string | null;
  bioSourceConnected: boolean;
  wearableSource: string | null;
  
  // Actions
  setAuthenticated: (value: boolean) => void;
  setWalletAddress: (address: string | null) => void;
  setNullifierHash: (hash: string | null) => void;
  setBioSourceConnected: (connected: boolean) => void;
  setWearableSource: (source: string | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  isAuthenticated: false,
  walletAddress: null,
  nullifierHash: null,
  bioSourceConnected: false,
  wearableSource: null,

  setAuthenticated: (value) => set({ isAuthenticated: value }),
  setWalletAddress: (address) => set({ walletAddress: address }),
  setNullifierHash: (hash) => set({ nullifierHash: hash }),
  setBioSourceConnected: (connected) => set({ bioSourceConnected: connected }),
  setWearableSource: (source) => set({ wearableSource: source }),

  logout: () => set({
    isAuthenticated: false,
    walletAddress: null,
    nullifierHash: null,
    bioSourceConnected: false,
    wearableSource: null,
  }),
}));
