use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

declare_id!("GNSYch111111111111111111111111111111111111");

#[program]
pub mod challenges {
    use super::*;

    pub fn create_challenge(
        ctx: Context<CreateChallenge>,
        _challenge_seed: i64,
        opponent: Pubkey,
        metric_kind: u8,
        target: u64,
        wager: u64,
        expiry: i64,
    ) -> Result<()> {
        let challenge = &mut ctx.accounts.challenge;
        challenge.creator = ctx.accounts.creator.key();
        challenge.opponent = opponent;
        challenge.metric_kind = metric_kind;
        challenge.target = target;
        challenge.wager = wager;
        challenge.expiry = expiry;
        challenge.creator_score = 0;
        challenge.opponent_score = 0;
        challenge.status = ChallengeStatus::Pending as u8;
        challenge.bump = *ctx.bumps.get("challenge").ok_or(ChallengeError::InvalidStatus)?;

        let cpi_accounts = Transfer {
            from: ctx.accounts.creator_token_account.to_account_info(),
            to: ctx.accounts.escrow_token_account.to_account_info(),
            authority: ctx.accounts.creator.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);
        token::transfer(cpi_ctx, wager)?;

        Ok(())
    }

    pub fn accept_challenge(ctx: Context<AcceptChallenge>) -> Result<()> {
        let challenge = &mut ctx.accounts.challenge;
        require!(
            challenge.status == ChallengeStatus::Pending as u8,
            ChallengeError::InvalidStatus
        );
        require!(
            challenge.opponent == ctx.accounts.opponent.key(),
            ChallengeError::Unauthorized
        );

        let cpi_accounts = Transfer {
            from: ctx.accounts.opponent_token_account.to_account_info(),
            to: ctx.accounts.escrow_token_account.to_account_info(),
            authority: ctx.accounts.opponent.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);
        token::transfer(cpi_ctx, challenge.wager)?;

        challenge.status = ChallengeStatus::Active as u8;
        Ok(())
    }

    pub fn submit_score(ctx: Context<SubmitScore>, score: u64) -> Result<()> {
        let challenge = &mut ctx.accounts.challenge;
        require!(
            challenge.status == ChallengeStatus::Active as u8,
            ChallengeError::InvalidStatus
        );

        let signer = ctx.accounts.participant.key();
        if signer == challenge.creator {
            require!(challenge.creator_score == 0, ChallengeError::AlreadySubmitted);
            challenge.creator_score = score;
        } else if signer == challenge.opponent {
            require!(challenge.opponent_score == 0, ChallengeError::AlreadySubmitted);
            challenge.opponent_score = score;
        } else {
            return err!(ChallengeError::Unauthorized);
        }

        if challenge.creator_score > 0 && challenge.opponent_score > 0 {
            challenge.status = ChallengeStatus::AwaitingScores as u8;
        }

        Ok(())
    }

    pub fn settle_challenge(ctx: Context<SettleChallenge>) -> Result<()> {
        let challenge = &mut ctx.accounts.challenge;
        require!(
            challenge.status != ChallengeStatus::Settled as u8,
            ChallengeError::AlreadySettled
        );
        require!(
            challenge.status != ChallengeStatus::Cancelled as u8,
            ChallengeError::InvalidStatus
        );

        let now = Clock::get()?.unix_timestamp;
        let both_submitted = challenge.creator_score > 0 && challenge.opponent_score > 0;

        if challenge.status == ChallengeStatus::Active as u8 {
            require!(both_submitted || now >= challenge.expiry, ChallengeError::NotExpired);
        } else if challenge.status != ChallengeStatus::AwaitingScores as u8 {
            return err!(ChallengeError::InvalidStatus);
        }

        let challenge_key = challenge.key();
        let escrow_bump = *ctx
            .bumps
            .get("escrow_authority")
            .ok_or(ChallengeError::InvalidStatus)?;
        let signer_seeds: &[&[u8]] = &[b"escrow", challenge_key.as_ref(), &[escrow_bump]];
        let signer = &[signer_seeds];

        let total_amount = ctx.accounts.escrow_token_account.amount;

        let creator_score = challenge.creator_score;
        let opponent_score = challenge.opponent_score;

        let creator_wins = if challenge.metric_kind == 3 {
            creator_score < opponent_score
        } else {
            creator_score > opponent_score
        };
        let opponent_wins = if challenge.metric_kind == 3 {
            opponent_score < creator_score
        } else {
            opponent_score > creator_score
        };

        if creator_wins {
            let cpi_accounts = Transfer {
                from: ctx.accounts.escrow_token_account.to_account_info(),
                to: ctx.accounts.creator_token_account.to_account_info(),
                authority: ctx.accounts.escrow_authority.to_account_info(),
            };
            let cpi_ctx = CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                cpi_accounts,
                signer,
            );
            token::transfer(cpi_ctx, total_amount)?;
        } else if opponent_wins {
            let cpi_accounts = Transfer {
                from: ctx.accounts.escrow_token_account.to_account_info(),
                to: ctx.accounts.opponent_token_account.to_account_info(),
                authority: ctx.accounts.escrow_authority.to_account_info(),
            };
            let cpi_ctx = CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                cpi_accounts,
                signer,
            );
            token::transfer(cpi_ctx, total_amount)?;
        } else {
            let creator_amount = challenge.wager.min(total_amount);
            let opponent_amount = total_amount.saturating_sub(creator_amount);

            if creator_amount > 0 {
                let cpi_accounts = Transfer {
                    from: ctx.accounts.escrow_token_account.to_account_info(),
                    to: ctx.accounts.creator_token_account.to_account_info(),
                    authority: ctx.accounts.escrow_authority.to_account_info(),
                };
                let cpi_ctx = CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    cpi_accounts,
                    signer,
                );
                token::transfer(cpi_ctx, creator_amount)?;
            }

            if opponent_amount > 0 {
                let cpi_accounts = Transfer {
                    from: ctx.accounts.escrow_token_account.to_account_info(),
                    to: ctx.accounts.opponent_token_account.to_account_info(),
                    authority: ctx.accounts.escrow_authority.to_account_info(),
                };
                let cpi_ctx = CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    cpi_accounts,
                    signer,
                );
                token::transfer(cpi_ctx, opponent_amount)?;
            }
        }

        challenge.status = ChallengeStatus::Settled as u8;
        Ok(())
    }

    pub fn cancel_challenge(ctx: Context<CancelChallenge>) -> Result<()> {
        let challenge = &mut ctx.accounts.challenge;
        require!(
            challenge.status == ChallengeStatus::Pending as u8,
            ChallengeError::InvalidStatus
        );
        require!(
            challenge.creator == ctx.accounts.creator.key(),
            ChallengeError::Unauthorized
        );

        let challenge_key = challenge.key();
        let escrow_bump = *ctx
            .bumps
            .get("escrow_authority")
            .ok_or(ChallengeError::InvalidStatus)?;
        let signer_seeds: &[&[u8]] = &[b"escrow", challenge_key.as_ref(), &[escrow_bump]];
        let signer = &[signer_seeds];

        let refund_amount = ctx.accounts.escrow_token_account.amount;
        if refund_amount > 0 {
            let cpi_accounts = Transfer {
                from: ctx.accounts.escrow_token_account.to_account_info(),
                to: ctx.accounts.creator_token_account.to_account_info(),
                authority: ctx.accounts.escrow_authority.to_account_info(),
            };
            let cpi_ctx = CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                cpi_accounts,
                signer,
            );
            token::transfer(cpi_ctx, refund_amount)?;
        }

        challenge.status = ChallengeStatus::Cancelled as u8;
        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(challenge_seed: i64)]
pub struct CreateChallenge<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,
    #[account(
        init,
        payer = creator,
        space = 8 + 128,
        seeds = [b"challenge", creator.key().as_ref(), &challenge_seed.to_le_bytes()],
        bump
    )]
    pub challenge: Account<'info, Challenge>,
    /// CHECK: PDA authority for escrow vault
    #[account(
        seeds = [b"escrow", challenge.key().as_ref()],
        bump
    )]
    pub escrow_authority: UncheckedAccount<'info>,
    #[account(
        init,
        payer = creator,
        token::mint = aura_mint,
        token::authority = escrow_authority
    )]
    pub escrow_token_account: Account<'info, TokenAccount>,
    pub aura_mint: Account<'info, Mint>,
    #[account(
        mut,
        constraint = creator_token_account.owner == creator.key(),
        constraint = creator_token_account.mint == aura_mint.key()
    )]
    pub creator_token_account: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct AcceptChallenge<'info> {
    #[account(mut)]
    pub opponent: Signer<'info>,
    #[account(mut)]
    pub challenge: Account<'info, Challenge>,
    /// CHECK: PDA authority for escrow vault
    #[account(
        seeds = [b"escrow", challenge.key().as_ref()],
        bump
    )]
    pub escrow_authority: UncheckedAccount<'info>,
    #[account(
        mut,
        constraint = escrow_token_account.owner == escrow_authority.key()
    )]
    pub escrow_token_account: Account<'info, TokenAccount>,
    #[account(
        mut,
        constraint = opponent_token_account.owner == opponent.key(),
        constraint = opponent_token_account.mint == escrow_token_account.mint
    )]
    pub opponent_token_account: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct SubmitScore<'info> {
    #[account(mut)]
    pub challenge: Account<'info, Challenge>,
    pub participant: Signer<'info>,
}

#[derive(Accounts)]
pub struct SettleChallenge<'info> {
    #[account(mut)]
    pub challenge: Account<'info, Challenge>,
    /// CHECK: PDA authority for escrow vault
    #[account(
        seeds = [b"escrow", challenge.key().as_ref()],
        bump
    )]
    pub escrow_authority: UncheckedAccount<'info>,
    #[account(
        mut,
        constraint = escrow_token_account.owner == escrow_authority.key()
    )]
    pub escrow_token_account: Account<'info, TokenAccount>,
    #[account(
        mut,
        constraint = creator_token_account.owner == challenge.creator,
        constraint = creator_token_account.mint == escrow_token_account.mint
    )]
    pub creator_token_account: Account<'info, TokenAccount>,
    #[account(
        mut,
        constraint = opponent_token_account.owner == challenge.opponent,
        constraint = opponent_token_account.mint == escrow_token_account.mint
    )]
    pub opponent_token_account: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct CancelChallenge<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,
    #[account(mut)]
    pub challenge: Account<'info, Challenge>,
    /// CHECK: PDA authority for escrow vault
    #[account(
        seeds = [b"escrow", challenge.key().as_ref()],
        bump
    )]
    pub escrow_authority: UncheckedAccount<'info>,
    #[account(
        mut,
        constraint = escrow_token_account.owner == escrow_authority.key()
    )]
    pub escrow_token_account: Account<'info, TokenAccount>,
    #[account(
        mut,
        constraint = creator_token_account.owner == creator.key(),
        constraint = creator_token_account.mint == escrow_token_account.mint
    )]
    pub creator_token_account: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[account]
pub struct Challenge {
    pub creator: Pubkey,
    pub opponent: Pubkey,
    pub metric_kind: u8,
    pub target: u64,
    pub wager: u64,
    pub expiry: i64,
    pub creator_score: u64,
    pub opponent_score: u64,
    pub status: u8,
    pub bump: u8,
}

#[repr(u8)]
pub enum ChallengeStatus {
    Pending = 0,
    Active = 1,
    AwaitingScores = 2,
    Settled = 3,
    Cancelled = 4,
}

#[error_code]
pub enum ChallengeError {
    #[msg("Unauthorized action")]
    Unauthorized,
    #[msg("Score already submitted")]
    AlreadySubmitted,
    #[msg("Challenge has not expired and both scores are not submitted")]
    NotExpired,
    #[msg("Challenge already settled")]
    AlreadySettled,
    #[msg("Invalid challenge status")]
    InvalidStatus,
}
