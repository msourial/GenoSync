import { create } from 'zustand';

export interface StakeInfo {
  amount: number;
  lockupPeriod: number;
  lockupEnd: number;
  boostMultiplier: number;
  stakedAt: number;
  pda?: string;
}

export interface StakingState {
  stakeInfo: StakeInfo | null;
  auraBalance: number;
  setStakeInfo: (info: StakeInfo | null) => void;
  setAuraBalance: (balance: number) => void;
  stake: (amount: number, lockupPeriod: number) => Promise<void>;
  unstake: (amount: number) => Promise<void>;
  refresh: () => Promise<void>;
}

export const useStakingStore = create<StakingState>((set) => ({
  stakeInfo: null,
  auraBalance: 0,

  setStakeInfo: (info) => {
    set({ stakeInfo: info });
  },

  setAuraBalance: (balance) => {
    set({ auraBalance: Number.isFinite(balance) ? balance : 0 });
  },

  stake: async (_amount, _lockupPeriod) => {
    throw new Error('Program not deployed');
  },

  unstake: async (_amount) => {
    throw new Error('Program not deployed');
  },

  refresh: async () => {
    // Hooks cannot run inside Zustand store.
    // Screen-level effects should call setStakeInfo / setAuraBalance with hook outputs.
  },
}));
