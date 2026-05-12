import * as anchor from '@project-serum/anchor';
import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from '@solana/spl-token';

/**
 * GenoSync Staking SDK
 * 
 * Interacts with the AURA token staking program on Solana.
 * Features:
 * - Stake AURA tokens for wellness boost multipliers
 * - 30-day and 90-day lockup options
 * - Real-time boost calculation
 * - Unstake after lockup period
 */

// Program ID (replace with actual deployed address)
const STAKING_PROGRAM_ID = new PublicKey(
  'GNSYn111111111111111111111111111111111111111'
);

// AURA Token Mint (replace with actual SPL token)
const AURA_TOKEN_MINT = new PublicKey(
  'AURA1111111111111111111111111111111111111111'
);

export enum LockupPeriod {
  Days30 = 0,
  Days90 = 1,
}

export interface StakingPool {
  authority: PublicKey;
  tokenMint: PublicKey;
  totalStaked: anchor.BN;
  lockupDuration30d: anchor.BN;
  lockupDuration90d: anchor.BN;
  boostMultiplier30d: anchor.BN;
  boostMultiplier90d: anchor.BN;
  bump: number;
}

export interface StakeAccount {
  owner: PublicKey;
  pool: PublicKey;
  amount: anchor.BN;
  lockupPeriod: number;
  lockupEnd: anchor.BN;
  boostMultiplier: anchor.BN;
  stakedAt: anchor.BN;
  bump: number;
}

export interface StakeInfo {
  amount: number; // in AURA tokens
  lockupPeriod: LockupPeriod;
  lockupEnd: Date;
  boostMultiplier: number; // e.g., 200 = 2x
  stakedAt: Date;
  isLocked: boolean;
  timeRemaining: number; // seconds
}

export class StakingClient {
  private program: anchor.Program;
  private provider: anchor.Provider;

  constructor(provider: anchor.Provider) {
    this.provider = provider;
    
    // Load IDL from file or hardcode minimal interface
    const idl = {
      version: '0.1.0',
      name: 'staking',
      instructions: [
        {
          name: 'initializePool',
          accounts: [
            { name: 'authority', isMut: true, isSigner: true },
            { name: 'pool', isMut: true, isSigner: false },
            { name: 'tokenMint', isMut: false, isSigner: false },
            { name: 'poolVault', isMut: true, isSigner: false },
            { name: 'tokenProgram', isMut: false, isSigner: false },
            { name: 'systemProgram', isMut: false, isSigner: false },
            { name: 'rent', isMut: false, isSigner: false },
          ],
          args: [
            { name: 'lockupDuration30d', type: 'i64' },
            { name: 'lockupDuration90d', type: 'i64' },
            { name: 'boostMultiplier30d', type: 'u64' },
            { name: 'boostMultiplier90d', type: 'u64' },
          ],
        },
        {
          name: 'stake',
          accounts: [
            { name: 'user', isMut: true, isSigner: true },
            { name: 'pool', isMut: true, isSigner: false },
            { name: 'stakeAccount', isMut: true, isSigner: false },
            { name: 'userTokenAccount', isMut: true, isSigner: false },
            { name: 'poolVault', isMut: true, isSigner: false },
            { name: 'tokenProgram', isMut: false, isSigner: false },
            { name: 'systemProgram', isMut: false, isSigner: false },
            { name: 'rent', isMut: false, isSigner: false },
          ],
          args: [
            { name: 'amount', type: 'u64' },
            { name: 'lockupPeriod', type: { defined: 'LockupPeriod' } },
          ],
        },
        {
          name: 'unstake',
          accounts: [
            { name: 'user', isMut: true, isSigner: true },
            { name: 'pool', isMut: true, isSigner: false },
            { name: 'stakeAccount', isMut: true, isSigner: false },
            { name: 'poolVault', isMut: true, isSigner: false },
            { name: 'userTokenAccount', isMut: true, isSigner: false },
            { name: 'tokenProgram', isMut: false, isSigner: false },
          ],
          args: [],
        },
        {
          name: 'claimWellnessBoost',
          accounts: [
            { name: 'user', isMut: false, isSigner: true },
            { name: 'pool', isMut: false, isSigner: false },
            { name: 'stakeAccount', isMut: false, isSigner: false },
          ],
          args: [{ name: 'baseXp', type: 'u64' }],
        },
      ],
      accounts: [
        {
          name: 'StakingPool',
          type: {
            kind: 'struct',
            fields: [
              { name: 'authority', type: 'publicKey' },
              { name: 'tokenMint', type: 'publicKey' },
              { name: 'totalStaked', type: 'u64' },
              { name: 'lockupDuration30d', type: 'i64' },
              { name: 'lockupDuration90d', type: 'i64' },
              { name: 'boostMultiplier30d', type: 'u64' },
              { name: 'boostMultiplier90d', type: 'u64' },
              { name: 'bump', type: 'u8' },
            ],
          },
        },
        {
          name: 'StakeAccount',
          type: {
            kind: 'struct',
            fields: [
              { name: 'owner', type: 'publicKey' },
              { name: 'pool', type: 'publicKey' },
              { name: 'amount', type: 'u64' },
              { name: 'lockupPeriod', type: 'u8' },
              { name: 'lockupEnd', type: 'i64' },
              { name: 'boostMultiplier', type: 'u64' },
              { name: 'stakedAt', type: 'i64' },
              { name: 'bump', type: 'u8' },
            ],
          },
        },
      ],
      types: [
        {
          name: 'LockupPeriod',
          type: {
            kind: 'enum',
            variants: [
              { name: 'Days30' },
              { name: 'Days90' },
            ],
          },
        },
      ],
      events: [
        {
          name: 'WellnessBoostClaimed',
          fields: [
            { name: 'user', type: 'publicKey', index: false },
            { name: 'stakeAccount', type: 'publicKey', index: false },
            { name: 'baseXp', type: 'u64', index: false },
            { name: 'boostedXp', type: 'u64', index: false },
            { name: 'multiplier', type: 'u64', index: false },
            { name: 'timestamp', type: 'i64', index: false },
          ],
        },
      ],
      errors: [
        { code: 6000, name: 'InvalidAmount', msg: 'Invalid staking amount' },
        { code: 6001, name: 'LockupActive', msg: 'Lockup period still active' },
        { code: 6002, name: 'InvalidOwner', msg: 'Invalid owner' },
      ],
    };

    // @ts-ignore
    this.program = new anchor.Program(idl, STAKING_PROGRAM_ID, provider);
  }

  /**
   * Get the staking pool PDA
   */
  async getPoolPDA(): Promise<[PublicKey, number]> {
    return PublicKey.findProgramAddressSync(
      [Buffer.from('pool'), AURA_TOKEN_MINT.toBuffer()],
      STAKING_PROGRAM_ID
    );
  }

  /**
   * Get the pool vault token account
   */
  async getPoolVaultPDA(pool: PublicKey): Promise<[PublicKey, number]> {
    return PublicKey.findProgramAddressSync(
      [Buffer.from('pool_vault'), AURA_TOKEN_MINT.toBuffer()],
      STAKING_PROGRAM_ID
    );
  }

  /**
   * Get the stake account PDA for a user
   */
  async getStakeAccountPDA(user: PublicKey, pool: PublicKey): Promise<[PublicKey, number]> {
    return PublicKey.findProgramAddressSync(
      [Buffer.from('stake'), user.toBuffer(), pool.toBuffer()],
      STAKING_PROGRAM_ID
    );
  }

  /**
   * Initialize the staking pool (only callable once by authority)
   */
  async initializePool(): Promise<string> {
    const [poolPDA] = await this.getPoolPDA();
    const [poolVaultPDA] = await this.getPoolVaultPDA(poolPDA);

    const tx = await this.program.methods
      .initializePool(
        new anchor.BN(30 * 24 * 60 * 60), // 30 days in seconds
        new anchor.BN(90 * 24 * 60 * 60), // 90 days in seconds
        new anchor.BN(200), // 2x boost for 30 days
        new anchor.BN(300) // 3x boost for 90 days
      )
      .accounts({
        authority: this.provider.wallet.publicKey,
        pool: poolPDA,
        tokenMint: AURA_TOKEN_MINT,
        poolVault: poolVaultPDA,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .rpc();

    return tx;
  }

  /**
   * Stake AURA tokens
   * @param amount Amount in AURA tokens (will be converted to lamports)
   * @param lockupPeriod 30 or 90 days
   */
  async stake(amount: number, lockupPeriod: LockupPeriod): Promise<string> {
    const user = this.provider.wallet.publicKey;
    const [poolPDA] = await this.getPoolPDA();
    const [poolVaultPDA] = await this.getPoolVaultPDA(poolPDA);
    const [stakeAccountPDA] = await this.getStakeAccountPDA(user, poolPDA);

    const userTokenAccount = await getAssociatedTokenAddress(AURA_TOKEN_MINT, user);

    // Convert to lamports (assuming 9 decimals like SOL)
    const amountLamports = new anchor.BN(amount * 1e9);

    const tx = await this.program.methods
      .stake(amountLamports, lockupPeriod)
      .accounts({
        user,
        pool: poolPDA,
        stakeAccount: stakeAccountPDA,
        userTokenAccount,
        poolVault: poolVaultPDA,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .rpc();

    return tx;
  }

  /**
   * Unstake tokens after lockup period
   */
  async unstake(): Promise<string> {
    const user = this.provider.wallet.publicKey;
    const [poolPDA] = await this.getPoolPDA();
    const [poolVaultPDA] = await this.getPoolVaultPDA(poolPDA);
    const [stakeAccountPDA] = await this.getStakeAccountPDA(user, poolPDA);
    const userTokenAccount = await getAssociatedTokenAddress(AURA_TOKEN_MINT, user);

    const tx = await this.program.methods
      .unstake()
      .accounts({
        user,
        pool: poolPDA,
        stakeAccount: stakeAccountPDA,
        poolVault: poolVaultPDA,
        userTokenAccount,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();

    return tx;
  }

  /**
   * Get stake info for current user
   */
  async getStakeInfo(): Promise<StakeInfo | null> {
    const user = this.provider.wallet.publicKey;
    const [poolPDA] = await this.getPoolPDA();
    const [stakeAccountPDA] = await this.getStakeAccountPDA(user, poolPDA);

    try {
      const stakeAccount = await this.program.account.stakeAccount.fetch(stakeAccountPDA);
      const now = Math.floor(Date.now() / 1000);

      return {
        amount: stakeAccount.amount.toNumber() / 1e9,
        lockupPeriod: stakeAccount.lockupPeriod,
        lockupEnd: new Date(stakeAccount.lockupEnd.toNumber() * 1000),
        boostMultiplier: stakeAccount.boostMultiplier.toNumber(),
        stakedAt: new Date(stakeAccount.stakedAt.toNumber() * 1000),
        isLocked: now < stakeAccount.lockupEnd.toNumber(),
        timeRemaining: Math.max(0, stakeAccount.lockupEnd.toNumber() - now),
      };
    } catch (error) {
      // No stake account found
      return null;
    }
  }

  /**
   * Calculate wellness boost for a given base XP
   */
  async calculateBoost(baseXp: number): Promise<{
    baseXp: number;
    boostedXp: number;
    multiplier: number;
  }> {
    const stakeInfo = await this.getStakeInfo();
    
    if (!stakeInfo) {
      return { baseXp, boostedXp: baseXp, multiplier: 100 };
    }

    const multiplier = stakeInfo.boostMultiplier;
    const boostedXp = Math.floor((baseXp * multiplier) / 100);

    return { baseXp, boostedXp, multiplier };
  }

  /**
   * Claim wellness boost (emits event for off-chain processing)
   */
  async claimWellnessBoost(baseXp: number): Promise<string> {
    const user = this.provider.wallet.publicKey;
    const [poolPDA] = await this.getPoolPDA();
    const [stakeAccountPDA] = await this.getStakeAccountPDA(user, poolPDA);

    const tx = await this.program.methods
      .claimWellnessBoost(new anchor.BN(baseXp))
      .accounts({
        user,
        pool: poolPDA,
        stakeAccount: stakeAccountPDA,
      })
      .rpc();

    return tx;
  }

  /**
   * Get total staked amount in the pool
   */
  async getTotalStaked(): Promise<number> {
    const [poolPDA] = await this.getPoolPDA();
    
    try {
      const pool = await this.program.account.stakingPool.fetch(poolPDA);
      return pool.totalStaked.toNumber() / 1e9;
    } catch (error) {
      return 0;
    }
  }
}

/**
 * Format lockup period for display
 */
export function formatLockupPeriod(period: LockupPeriod): string {
  switch (period) {
    case LockupPeriod.Days30:
      return '30 Days';
    case LockupPeriod.Days90:
      return '90 Days';
    default:
      return 'Unknown';
  }
}

/**
 * Format multiplier for display
 */
export function formatMultiplier(multiplier: number): string {
  return `${(multiplier / 100).toFixed(1)}x`;
}

/**
 * Format time remaining in human-readable format
 */
export function formatTimeRemaining(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}
