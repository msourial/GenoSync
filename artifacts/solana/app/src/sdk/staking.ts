/**
 * Staking SDK - TypeScript helpers for AURA staking program
 * 
 * Provides enums, formatters, and utility functions for the staking UI.
 * Program interaction is handled via Anchor (future implementation).
 */

export enum LockupPeriod {
  Days30 = 30,
  Days90 = 90,
}

export function formatLockupPeriod(period: LockupPeriod): string {
  return `${period} Days`;
}

export function formatMultiplier(multiplier: number): string {
  return `${(multiplier / 100).toFixed(1)}x`;
}

export function formatTimeRemaining(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

export interface StakingPool {
  totalStaked: number;
  rewardRate: number;
  minStake: number;
}

export interface StakeAccount {
  amount: number;
  lockupPeriod: LockupPeriod;
  lockupEnd: number; // Unix timestamp
  stakedAt: number; // Unix timestamp
  boostMultiplier: number;
}
