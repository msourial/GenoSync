use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

// GenoSync DAO Governance Program
// AURA token holders can vote on wellness challenge parameters

declare_id!("GOV1111111111111111111111111111111111111111");

pub const MIN_VOTING_PERIOD: i64 = 24 * 60 * 60; // 1 day
pub const MIN_PROPOSAL_THRESHOLD: u64 = 1000 * 1_000_000_000; // 1000 AURA

#[program]
pub mod governance {
    use super::*;

    // Initialize governance DAO
    pub fn initialize_dao(
        ctx: Context<InitializeDao>,
        voting_period: i64,
        proposal_threshold: u64,
        quorum_votes: u64,
    ) -> Result<()> {
        require!(
            voting_period >= MIN_VOTING_PERIOD,
            ErrorCode::VotingPeriodTooShort
        );

        let dao = &mut ctx.accounts.dao;
        dao.authority = ctx.accounts.authority.key();
        dao.token_mint = ctx.accounts.token_mint.key();
        dao.voting_period = voting_period;
        dao.proposal_threshold = proposal_threshold;
        dao.quorum_votes = quorum_votes;
        dao.proposal_count = 0;
        dao.bump = ctx.bumps.dao;

        msg!("GenoSync DAO initialized");
        Ok(())
    }

    // Create a new proposal
    pub fn create_proposal(
        ctx: Context<CreateProposal>,
        title: String,
        description: String,
        proposal_type: ProposalType,
        parameters: ProposalParameters,
    ) -> Result<()> {
        // Verify proposer has enough AURA tokens
        let proposer_balance = ctx.accounts.proposer_token_account.amount;
        require!(
            proposer_balance >= ctx.accounts.dao.proposal_threshold,
            ErrorCode::InsufficientBalance
        );

        let dao = &mut ctx.accounts.dao;
        let proposal = &mut ctx.accounts.proposal;
        
        let proposal_id = dao.proposal_count + 1;
        
        proposal.id = proposal_id;
        proposal.proposer = ctx.accounts.proposer.key();
        proposal.title = title;
        proposal.description = description;
        proposal.proposal_type = proposal_type as u8;
        proposal.parameters = parameters;
        proposal.for_votes = 0;
        proposal.against_votes = 0;
        proposal.status = ProposalStatus::Active as u8;
        proposal.created_at = Clock::get()?.unix_timestamp;
        proposal.voting_ends = proposal.created_at + dao.voting_period;
        proposal.executed = false;
        proposal.bump = ctx.bumps.proposal;

        dao.proposal_count = proposal_id;

        emit!(ProposalCreated {
            proposal_id,
            proposer: ctx.accounts.proposer.key(),
            title: proposal.title.clone(),
            proposal_type,
            voting_ends: proposal.voting_ends,
        });

        msg!("Proposal #{} created: {}", proposal_id, proposal.title);
        Ok(())
    }

    // Cast a vote
    pub fn cast_vote(
        ctx: Context<CastVote>,
        support: bool, // true = for, false = against
        vote_weight: u64, // amount of AURA to vote with
    ) -> Result<()> {
        let proposal = &mut ctx.accounts.proposal;
        let now = Clock::get()?.unix_timestamp;

        require!(
            proposal.status == ProposalStatus::Active as u8,
            ErrorCode::ProposalNotActive
        );
        require!(
            now < proposal.voting_ends,
            ErrorCode::VotingEnded
        );

        // Transfer voting tokens to escrow
        let cpi_accounts = Transfer {
            from: ctx.accounts.voter_token_account.to_account_info(),
            to: ctx.accounts.vote_escrow.to_account_info(),
            authority: ctx.accounts.voter.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::transfer(cpi_ctx, vote_weight)?;

        // Record vote
        let vote = &mut ctx.accounts.vote;
        vote.voter = ctx.accounts.voter.key();
        vote.proposal = proposal.key();
        vote.support = support;
        vote.weight = vote_weight;
        vote.bump = ctx.bumps.vote;

        // Update proposal vote counts
        if support {
            proposal.for_votes = proposal.for_votes.checked_add(vote_weight).unwrap();
        } else {
            proposal.against_votes = proposal.against_votes.checked_add(vote_weight).unwrap();
        }

        emit!(VoteCast {
            proposal_id: proposal.id,
            voter: ctx.accounts.voter.key(),
            support,
            weight: vote_weight,
        });

        msg!(
            "Vote cast on proposal #{}: {} {} AURA",
            proposal.id,
            if support { "FOR" } else { "AGAINST" },
            vote_weight / 1_000_000_000
        );
        Ok(())
    }

    // Execute a passed proposal
    pub fn execute_proposal(ctx: Context<ExecuteProposal>) -> Result<()> {
        let proposal = &mut ctx.accounts.proposal;
        let dao = &ctx.accounts.dao;
        let now = Clock::get()?.unix_timestamp;

        require!(
            now > proposal.voting_ends,
            ErrorCode::VotingNotEnded
        );
        require!(
            !proposal.executed,
            ErrorCode::AlreadyExecuted
        );

        let total_votes = proposal.for_votes + proposal.against_votes;
        let quorum_reached = total_votes >= dao.quorum_votes;
        let majority_for = proposal.for_votes > proposal.against_votes;

        require!(quorum_reached, ErrorCode::QuorumNotReached);
        require!(majority_for, ErrorCode::MajorityAgainst);

        proposal.status = ProposalStatus::Executed as u8;
        proposal.executed = true;

        emit!(ProposalExecuted {
            proposal_id: proposal.id,
            parameters: proposal.parameters.clone(),
        });

        msg!("Proposal #{} executed", proposal.id);
        Ok(())
    }

    // Withdraw vote after proposal ends
    pub fn withdraw_vote(ctx: Context<WithdrawVote>) -> Result<()> {
        let proposal = &ctx.accounts.proposal;
        let vote = &ctx.accounts.vote;

        require!(
            proposal.status != ProposalStatus::Active as u8,
            ErrorCode::ProposalStillActive
        );

        // Return tokens from escrow
        let dao_key = ctx.accounts.dao.key();
        let proposal_id = proposal.id;
        let seeds = &[
            b"vote_escrow",
            dao_key.as_ref(),
            &proposal_id.to_le_bytes(),
            &[ctx.bumps.vote_escrow],
        ];
        let signer = &[&seeds[..]];

        let cpi_accounts = Transfer {
            from: ctx.accounts.vote_escrow.to_account_info(),
            to: ctx.accounts.voter_token_account.to_account_info(),
            authority: ctx.accounts.vote_escrow.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
        token::transfer(cpi_ctx, vote.weight)?;

        msg!("Vote withdrawn, {} AURA returned", vote.weight / 1_000_000_000);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializeDao<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    
    #[account(
        init,
        payer = authority,
        space = 8 + Dao::SIZE,
        seeds = [b"dao", token_mint.key().as_ref()],
        bump
    )]
    pub dao: Account<'info, Dao>,
    
    pub token_mint: Account<'info, token::Mint>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CreateProposal<'info> {
    #[account(mut)]
    pub proposer: Signer<'info>,
    
    #[account(mut)]
    pub dao: Account<'info, Dao>,
    
    #[account(
        init,
        payer = proposer,
        space = 8 + Proposal::SIZE,
        seeds = [b"proposal", dao.key().as_ref(), &(dao.proposal_count + 1).to_le_bytes()],
        bump
    )]
    pub proposal: Account<'info, Proposal>,
    
    #[account(
        mut,
        constraint = proposer_token_account.owner == proposer.key(),
        constraint = proposer_token_account.mint == dao.token_mint
    )]
    pub proposer_token_account: Account<'info, TokenAccount>,
    
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CastVote<'info> {
    #[account(mut)]
    pub voter: Signer<'info>,
    
    #[account(mut)]
    pub proposal: Account<'info, Proposal>,
    
    #[account(
        init,
        payer = voter,
        space = 8 + Vote::SIZE,
        seeds = [b"vote", proposal.key().as_ref(), voter.key().as_ref()],
        bump
    )]
    pub vote: Account<'info, Vote>,
    
    #[account(
        mut,
        constraint = voter_token_account.owner == voter.key()
    )]
    pub voter_token_account: Account<'info, TokenAccount>,
    
    #[account(
        init,
        payer = voter,
        token::mint = dao.token_mint,
        token::authority = vote_escrow,
        seeds = [b"vote_escrow", dao.key().as_ref(), &proposal.id.to_le_bytes()],
        bump
    )]
    pub vote_escrow: Account<'info, TokenAccount>,
    
    pub dao: Account<'info, Dao>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct ExecuteProposal<'info> {
    pub executor: Signer<'info>,
    
    #[account(mut)]
    pub proposal: Account<'info, Proposal>,
    
    pub dao: Account<'info, Dao>,
}

#[derive(Accounts)]
pub struct WithdrawVote<'info> {
    #[account(mut)]
    pub voter: Signer<'info>,
    
    pub proposal: Account<'info, Proposal>,
    
    #[account(
        mut,
        seeds = [b"vote", proposal.key().as_ref(), voter.key().as_ref()],
        bump = vote.bump,
        close = voter
    )]
    pub vote: Account<'info, Vote>,
    
    #[account(
        mut,
        seeds = [b"vote_escrow", dao.key().as_ref(), &proposal.id.to_le_bytes()],
        bump
    )]
    pub vote_escrow: Account<'info, TokenAccount>,
    
    #[account(
        mut,
        constraint = voter_token_account.owner == voter.key()
    )]
    pub voter_token_account: Account<'info, TokenAccount>,
    
    pub dao: Account<'info, Dao>,
    pub token_program: Program<'info, Token>,
}

#[account]
pub struct Dao {
    pub authority: Pubkey,
    pub token_mint: Pubkey,
    pub voting_period: i64,
    pub proposal_threshold: u64,
    pub quorum_votes: u64,
    pub proposal_count: u64,
    pub bump: u8,
}

impl Dao {
    pub const SIZE: usize = 32 + 32 + 8 + 8 + 8 + 8 + 1;
}

#[account]
pub struct Proposal {
    pub id: u64,
    pub proposer: Pubkey,
    pub title: String,
    pub description: String,
    pub proposal_type: u8,
    pub parameters: ProposalParameters,
    pub for_votes: u64,
    pub against_votes: u64,
    pub status: u8,
    pub created_at: i64,
    pub voting_ends: i64,
    pub executed: bool,
    pub bump: u8,
}

impl Proposal {
    // Max string sizes: title 100, description 1000
    pub const SIZE: usize = 8 + 32 + 4 + 100 + 4 + 1000 + 1 + ProposalParameters::SIZE + 8 + 8 + 1 + 8 + 8 + 1 + 1;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct ProposalParameters {
    pub challenge_difficulty: u8,    // 1-10 scale
    pub reward_multiplier: u64,      // basis points
    pub new_feature_enabled: bool,
    pub parameter_key: String,
    pub parameter_value: u64,
}

impl ProposalParameters {
    pub const SIZE: usize = 1 + 8 + 1 + 4 + 50 + 8;
}

#[account]
pub struct Vote {
    pub voter: Pubkey,
    pub proposal: Pubkey,
    pub support: bool,
    pub weight: u64,
    pub bump: u8,
}

impl Vote {
    pub const SIZE: usize = 32 + 32 + 1 + 8 + 1;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq)]
pub enum ProposalType {
    ChallengeDifficulty = 0,
    RewardRate = 1,
    NewFeature = 2,
    ParameterChange = 3,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq)]
pub enum ProposalStatus {
    Active = 0,
    Defeated = 1,
    Succeeded = 2,
    Executed = 3,
}

#[event]
pub struct ProposalCreated {
    pub proposal_id: u64,
    pub proposer: Pubkey,
    pub title: String,
    pub proposal_type: ProposalType,
    pub voting_ends: i64,
}

#[event]
pub struct VoteCast {
    pub proposal_id: u64,
    pub voter: Pubkey,
    pub support: bool,
    pub weight: u64,
}

#[event]
pub struct ProposalExecuted {
    pub proposal_id: u64,
    pub parameters: ProposalParameters,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Voting period too short")]
    VotingPeriodTooShort,
    #[msg("Insufficient AURA balance to create proposal")]
    InsufficientBalance,
    #[msg("Proposal not active")]
    ProposalNotActive,
    #[msg("Voting has ended")]
    VotingEnded,
    #[msg("Voting has not ended yet")]
    VotingNotEnded,
    #[msg("Proposal already executed")]
    AlreadyExecuted,
    #[msg("Quorum not reached")]
    QuorumNotReached,
    #[msg("Majority voted against")]
    MajorityAgainst,
    #[msg("Proposal still active")]
    ProposalStillActive,
}
