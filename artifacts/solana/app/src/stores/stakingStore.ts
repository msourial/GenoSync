import { create } from 'zustand';
import { LockupPeriod } from '../sdk/staking';

/**
 * GenoSync Staking Store
 * 
 * Zustand store for managing staking state
 */

export interface StakeInfo {
  amount: number;
  lockupPeriod: LockupPeriod;
  lockupEnd: number;
  boostMultiplier: number;
  stakedAt: number;
  isLocked: boolean;
  timeRemaining: number;
}

interface StakingState {
  // State
  stakeInfo: StakeInfo | null;
  auraBalance: number;
  isLoading: boolean;
  error: string | null;

  // Actions
  setStakeInfo: (info: StakeInfo | null) => void;
  setAuraBalance: (balance: number) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Async actions
  stake: (amount: number, lockupPeriod: LockupPeriod) => Promise<void>;
  unstake: () => Promise<void>;
  refresh: () => Promise<void>;
  calculateBoost: (baseXp: number) => number;
}

// Mock staking client for development
const mockStakingClient = {
  stake: async (amount: number, period: LockupPeriod): Promise<void> => {
    // Simulate blockchain delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log(`[Mock] Staked ${amount} AURA for ${period === LockupPeriod.Days30 ? '30' : '90'} days`);
  },
  
  unstake: async (): Promise<void> => {
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log('[Mock] Unstaked AURA');
  },
  
  getStakeInfo: async (): Promise<StakeInfo | null> => {
    await new Promise(resolve => setTimeout(resolve, 500));
    // Return mock data
    return {
      amount: 5000,
      lockupPeriod: LockupPeriod.Days30,
      lockupEnd: Date.now() + 15 * 24 * 60 * 60 * 1000, // 15 days remaining
      boostMultiplier: 200,
      stakedAt: Date.now() - 15 * 24 * 60 * 60 * 1000,
      isLocked: true,
      timeRemaining: 15 * 24 * 60 * 60,
    };
  },
};

export const useStakingStore = create<StakingState>((set, get) => ({
  // Initial state
  stakeInfo: null,
  auraBalance: 15000,
  isLoading: false,
  error: null,

  // Setters
  setStakeInfo: (info) => set({ stakeInfo: info }),
  setAuraBalance: (balance) => set({ auraBalance: balance }),
  setLoading: (loading) => set({ isLoading: loading }),
  setError: (error) => set({ error }),

  // Actions
  stake: async (amount: number, lockupPeriod: LockupPeriod) => {
    const { auraBalance } = get();
    
    if (amount > auraBalance) {
      set({ error: 'Insufficient balance' });
      return;
    }

    set({ isLoading: true, error: null });
    
    try {
      await mockStakingClient.stake(amount, lockupPeriod);
      
      const now = Date.now();
      const lockupDays = lockupPeriod === LockupPeriod.Days30 ? 30 : 90;
      const multiplier = lockupPeriod === LockupPeriod.Days30 ? 200 : 300;
      
      const newStakeInfo: StakeInfo = {
        amount,
        lockupPeriod,
        lockupEnd: now + lockupDays * 24 * 60 * 60 * 1000,
        boostMultiplier: multiplier,
        stakedAt: now,
        isLocked: true,
        timeRemaining: lockupDays * 24 * 60 * 60,
      };

      set({
        stakeInfo: newStakeInfo,
        auraBalance: auraBalance - amount,
        isLoading: false,
      });
    } catch (error) {
      set({ error: 'Failed to stake', isLoading: false });
    }
  },

  unstake: async () => {
    const { stakeInfo, auraBalance } = get();
    
    if (!stakeInfo) {
      set({ error: 'No stake found' });
      return;
    }

    if (stakeInfo.isLocked) {
      set({ error: 'Stake is still locked' });
      return;
    }

    set({ isLoading: true, error: null });
    
    try {
      await mockStakingClient.unstake();
      
      set({
        stakeInfo: null,
        auraBalance: auraBalance + stakeInfo.amount,
        isLoading: false,
      });
    } catch (error) {
      set({ error: 'Failed to unstake', isLoading: false });
    }
  },

  refresh: async () => {
    set({ isLoading: true });
    
    try {
      const info = await mockStakingClient.getStakeInfo();
      
      // Update lock status
      if (info) {
        const now = Date.now();
        info.isLocked = now < info.lockupEnd;
        info.timeRemaining = Math.max(0, Math.floor((info.lockupEnd - now) / 1000));
      }
      
      set({ stakeInfo: info, isLoading: false });
    } catch (error) {
      set({ error: 'Failed to refresh', isLoading: false });
    }
  },

  calculateBoost: (baseXp: number): number => {
    const { stakeInfo } = get();
    
    if (!stakeInfo) {
      return baseXp;
    }

    const multiplier = stakeInfo.boostMultiplier / 100;
    return Math.floor(baseXp * multiplier);
  },
}));

// Initialize store
useStakingStore.getState().refresh();
