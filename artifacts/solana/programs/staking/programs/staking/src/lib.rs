use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

// GenoSync AURA Token Staking Program
// Users stake AURA tokens to earn wellness boost multipliers

declare_id!("GNSYn111111111111111111111111111111111111111");

#[program]
pub mod staking {
    use super::*;

    // Initialize staking pool
    pub fn initialize_pool(
        ctx: Context<InitializePool>,
        lockup_duration_30d: i64,
        lockup_duration_90d: i64,
        boost_multiplier_30d: u64,
        boost_multiplier_90d: u64,
    ) -> Result<()> {
        let pool = &mut ctx.accounts.pool;
        pool.authority = ctx.accounts.authority.key();
        pool.token_mint = ctx.accounts.token_mint.key();
        pool.total_staked = 0;
        pool.lockup_duration_30d = lockup_duration_30d;
        pool.lockup_duration_90d = lockup_duration_90d;
        pool.boost_multiplier_30d = boost_multiplier_30d;
        pool.boost_multiplier_90d = boost_multiplier_90d;
        pool.bump = ctx.bumps.pool;

        msg!("Staking pool initialized for AURA token");
        Ok(())
    }

    // Stake AURA tokens
    pub fn stake(
        ctx: Context<Stake>,
        amount: u64,
        lockup_period: LockupPeriod,
    ) -> Result<()> {
        require!(amount > 0, ErrorCode::InvalidAmount);

        let pool = &ctx.accounts.pool;
        let lockup_duration = match lockup_period {
            LockupPeriod::Days30 => pool.lockup_duration_30d,
            LockupPeriod::Days90 => pool.lockup_duration_90d,
        };
        let boost_multiplier = match lockup_period {
            LockupPeriod::Days30 => pool.boost_multiplier_30d,
            LockupPeriod::Days90 => pool.boost_multiplier_90d,
        };

        // Transfer tokens from user to pool vault
        let cpi_accounts = Transfer {
            from: ctx.accounts.user_token_account.to_account_info(),
            to: ctx.accounts.pool_vault.to_account_info(),
            authority: ctx.accounts.user.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::transfer(cpi_ctx, amount)?;

        // Create/update stake account
        let stake_account = &mut ctx.accounts.stake_account;
        stake_account.owner = ctx.accounts.user.key();
        stake_account.pool = ctx.accounts.pool.key();
        stake_account.amount = amount;
        stake_account.lockup_period = lockup_period as u8;
        stake_account.lockup_end = Clock::get()?.unix_timestamp + lockup_duration;
        stake_account.boost_multiplier = boost_multiplier;
        stake_account.staked_at = Clock::get()?.unix_timestamp;
        stake_account.bump = ctx.bumps.stake_account;

        // Update pool total
        let pool = &mut ctx.accounts.pool;
        pool.total_staked = pool.total_staked.checked_add(amount).unwrap();

        msg!("Staked {} AURA tokens with {}x boost", amount, boost_multiplier);
        Ok(())
    }

    // Unstake tokens after lockup period
    pub fn unstake(ctx: Context<Unstake>) -> Result<()> {
        let stake_account = &ctx.accounts.stake_account;
        let current_time = Clock::get()?.unix_timestamp;

        require!(
            current_time >= stake_account.lockup_end,
            ErrorCode::LockupActive
        );

        let amount = stake_account.amount;

        // Transfer tokens back to user
        let pool_key = ctx.accounts.pool.key();
        let seeds = &[
            b"pool_vault",
            pool_key.as_ref(),
            &[ctx.accounts.pool.bump],
        ];
        let signer = &[&seeds[..]];

        let cpi_accounts = Transfer {
            from: ctx.accounts.pool_vault.to_account_info(),
            to: ctx.accounts.user_token_account.to_account_info(),
            authority: ctx.accounts.pool.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
        token::transfer(cpi_ctx, amount)?;

        // Update pool total
        let pool = &mut ctx.accounts.pool;
        pool.total_staked = pool.total_staked.checked_sub(amount).unwrap();

        msg!("Unstaked {} AURA tokens", amount);
        Ok(())
    }

    // Claim wellness boost (called by oracle/AI when session completes)
    pub fn claim_wellness_boost(
        ctx: Context<ClaimWellnessBoost>,
        base_xp: u64,
    ) -> Result<()> {
        let stake_account = &ctx.accounts.stake_account;
        require!(
            stake_account.owner == ctx.accounts.user.key(),
            ErrorCode::InvalidOwner
        );

        let boosted_xp = base_xp
            .checked_mul(stake_account.boost_multiplier)
            .unwrap()
            .checked_div(100)
            .unwrap();

        msg!(
            "Wellness boost claimed: {} base XP -> {} boosted XP ({}x multiplier)",
            base_xp,
            boosted_xp,
            stake_account.boost_multiplier
        );

        // Emit event for off-chain minting
        emit!(WellnessBoostClaimed {
            user: ctx.accounts.user.key(),
            stake_account: ctx.accounts.stake_account.key(),
            base_xp,
            boosted_xp,
            multiplier: stake_account.boost_multiplier,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializePool<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    
    #[account(
        init,
        payer = authority,
        space = 8 + StakingPool::SIZE,
        seeds = [b"pool", token_mint.key().as_ref()],
        bump
    )]
    pub pool: Account<'info, StakingPool>,
    
    pub token_mint: Account<'info, Mint>,
    
    #[account(
        init,
        payer = authority,
        token::mint = token_mint,
        token::authority = pool,
        seeds = [b"pool_vault", token_mint.key().as_ref()],
        bump
    )]
    pub pool_vault: Account<'info, TokenAccount>,
    
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct Stake<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    
    #[account(mut)]
    pub pool: Account<'info, StakingPool>,
    
    #[account(
        init,
        payer = user,
        space = 8 + StakeAccount::SIZE,
        seeds = [b"stake", user.key().as_ref(), pool.key().as_ref()],
        bump
    )]
    pub stake_account: Account<'info, StakeAccount>,
    
    #[account(
        mut,
        constraint = user_token_account.owner == user.key(),
        constraint = user_token_account.mint == pool.token_mint
    )]
    pub user_token_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub pool_vault: Account<'info, TokenAccount>,
    
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct Unstake<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    
    #[account(mut)]
    pub pool: Account<'info, StakingPool>,
    
    #[account(
        mut,
        close = user,
        seeds = [b"stake", user.key().as_ref(), pool.key().as_ref()],
        bump = stake_account.bump
    )]
    pub stake_account: Account<'info, StakeAccount>,
    
    #[account(mut)]
    pub pool_vault: Account<'info, TokenAccount>,
    
    #[account(
        mut,
        constraint = user_token_account.owner == user.key(),
        constraint = user_token_account.mint == pool.token_mint
    )]
    pub user_token_account: Account<'info, TokenAccount>,
    
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct ClaimWellnessBoost<'info> {
    pub user: Signer<'info>,
    
    pub pool: Account<'info, StakingPool>,
    
    #[account(
        seeds = [b"stake", user.key().as_ref(), pool.key().as_ref()],
        bump = stake_account.bump
    )]
    pub stake_account: Account<'info, StakeAccount>,
}

#[account]
pub struct StakingPool {
    pub authority: Pubkey,
    pub token_mint: Pubkey,
    pub total_staked: u64,
    pub lockup_duration_30d: i64,      // seconds
    pub lockup_duration_90d: i64,      // seconds
    pub boost_multiplier_30d: u64,     // basis points (100 = 1x, 200 = 2x)
    pub boost_multiplier_90d: u64,     // basis points
    pub bump: u8,
}

impl StakingPool {
    pub const SIZE: usize = 32 + 32 + 8 + 8 + 8 + 8 + 8 + 1;
}

#[account]
pub struct StakeAccount {
    pub owner: Pubkey,
    pub pool: Pubkey,
    pub amount: u64,
    pub lockup_period: u8,              // 0 = 30d, 1 = 90d
    pub lockup_end: i64,                // timestamp
    pub boost_multiplier: u64,          // basis points
    pub staked_at: i64,                 // timestamp
    pub bump: u8,
}

impl StakeAccount {
    pub const SIZE: usize = 32 + 32 + 8 + 1 + 8 + 8 + 8 + 1;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq)]
pub enum LockupPeriod {
    Days30 = 0,
    Days90 = 1,
}

#[event]
pub struct WellnessBoostClaimed {
    pub user: Pubkey,
    pub stake_account: Pubkey,
    pub base_xp: u64,
    pub boosted_xp: u64,
    pub multiplier: u64,
    pub timestamp: i64,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Invalid staking amount")]
    InvalidAmount,
    #[msg("Lockup period still active")]
    LockupActive,
    #[msg("Invalid owner")]
    InvalidOwner,
}
