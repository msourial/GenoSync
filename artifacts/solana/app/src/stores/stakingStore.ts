import { create } from 'zustand';

export interface StakeInfo {
  amount: number;
  lockupPeriod: number;
  lockupEnd: number;
  boostMultiplier: number;
  stakedAt: number;
  pda?: string;
  isLocked?: boolean;
  timeRemaining?: number;
}

export interface StakingState {
  stakeInfo: StakeInfo | null;
  auraBalance: number;
  isLoading: boolean;
  setStakeInfo: (info: StakeInfo | null) => void;
  setAuraBalance: (balance: number) => void;
  stake: (amount: number, lockupPeriod: number) => Promise<void>;
  unstake: (amount?: number) => Promise<void>;
  refresh: () => Promise<void>;
}

export const useStakingStore = create<StakingState>((set) => ({
  stakeInfo: null,
  auraBalance: 0,
  isLoading: false,
  setStakeInfo: (info) => {
    if (info === null) {
      set({ stakeInfo: null });
    } else {
      set({
        stakeInfo: {
          ...info,
          isLocked: Date.now() < info.lockupEnd,
          timeRemaining: Math.max(0, Math.floor((info.lockupEnd - Date.now()) / 1000)),
        },
      });
    }
  },
  setAuraBalance: (balance) => { set({ auraBalance: Number.isFinite(balance) ? balance : 0 }); },
  stake: async (_amount, _lockupPeriod) => {
    set({ isLoading: true });
    try {
      throw new Error('Program not deployed');
    } finally {
      set({ isLoading: false });
    }
  },
  unstake: async (_amount?) => {
    set({ isLoading: true });
    try {
      throw new Error('Program not deployed');
    } finally {
      set({ isLoading: false });
    }
  },
  // Screen effects push values via setStakeInfo/setAuraBalance — hooks cannot run in zustand.
  refresh: async () => {},
}));
