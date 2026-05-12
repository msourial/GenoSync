/**
 * GenoSync Solana Mobile App - Shared Types
 */

export interface WellnessSession {
  id: string;
  walletAddress: string;
  startTime: number;
  endTime: number | null;
  duration: number;
  hrv: number;
  strain: number;
  apm: number;
  focusScore: number;
  grade: 'S' | 'A' | 'B' | 'C' | 'D' | null;
  challenges: string[];
  auraEarned: number;
  receiptCid: string | null;
  nftMint: string | null;
}

export interface Challenge {
  id: string;
  type: 'posture' | 'hydration' | 'stretch' | 'breathing' | 'movement' | 'meditation';
  title: string;
  description: string;
  xpReward: number;
  icon: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

export interface StakingPosition {
  amount: number;
  lockupPeriod: 30 | 90;
  lockupEnd: number;
  stakedAt: number;
  boostMultiplier: number;
}

export interface AuraTokenInfo {
  mint: string;
  decimals: number;
  symbol: string;
  name: string;
  totalSupply: number;
}

export interface WellnessReceipt {
  id: string;
  walletAddress: string;
  sessionId: string;
  timestamp: number;
  grade: string;
  auraEarned: number;
  signature: string;
  shadowDriveCid: string;
}
