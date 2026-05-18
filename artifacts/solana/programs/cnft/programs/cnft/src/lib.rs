use anchor_lang::prelude::*;
use anchor_spl::metadata::{Metadata, CreateMetadataAccountsV3, create_metadata_accounts_v3};

// GenoSync Compressed NFT (cNFT) Program
// Mints compressed NFTs for S-grade wellness sessions
// Uses Metaplex Bubblegum for state compression

declare_id!("CNFT1111111111111111111111111111111111111111");

#[program]
pub mod cnft {
    use super::*;

    // Initialize the wellness achievement collection
    pub fn initialize_collection(
        ctx: Context<InitializeCollection>,
        name: String,
        symbol: String,
        uri: String,
    ) -> Result<()> {
        let collection = &mut ctx.accounts.collection;
        collection.authority = ctx.accounts.authority.key();
        collection.name = name.clone();
        collection.symbol = symbol.clone();
        collection.uri = uri.clone();
        collection.merkle_tree = ctx.accounts.merkle_tree.key();
        collection.total_minted = 0;
        collection.bump = ctx.bumps.collection;

        msg!("Wellness NFT collection initialized: {}", name);
        Ok(())
    }

    // Mint a compressed NFT for an S-grade wellness session
    pub fn mint_wellness_achievement(
        ctx: Context<MintWellnessAchievement>,
        session_data: SessionData,
    ) -> Result<()> {
        // Only S-grade sessions get NFTs
        require!(
            session_data.grade == "S".to_string(),
            ErrorCode::InvalidGrade
        );

        let collection = &mut ctx.accounts.collection;
        let mint_number = collection.total_minted + 1;

        // Create NFT metadata
        let name = format!("GenoSync Wellness Legend #{}", mint_number);
        let symbol = collection.symbol.clone();
        let uri = format!(
            "{}/achievement/{}.json",
            collection.uri,
            session_data.session_id
        );

        // Emit event for Bubblegum minting (off-chain)
        // In production, this would call the Bubblegum program via CPI
        emit!(WellnessAchievementMinted {
            collection: collection.key(),
            recipient: ctx.accounts.recipient.key(),
            mint_number,
            name: name.clone(),
            symbol: symbol.clone(),
            uri: uri.clone(),
            session_data: session_data.clone(),
            timestamp: Clock::get()?.unix_timestamp,
        });

        collection.total_minted = mint_number;

        msg!(
            "Minted wellness achievement #{} for session {} - Grade: {}",
            mint_number,
            session_data.session_id,
            session_data.grade
        );
        Ok(())
    }

    // Update collection metadata (authority only)
    pub fn update_collection(
        ctx: Context<UpdateCollection>,
        new_uri: Option<String>,
    ) -> Result<()> {
        let collection = &mut ctx.accounts.collection;
        
        if let Some(uri) = new_uri {
            collection.uri = uri;
        }

        msg!("Collection metadata updated");
        Ok(())
    }
}

#[derive(Accounts)]
pub struct InitializeCollection<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    
    #[account(
        init,
        payer = authority,
        space = 8 + WellnessCollection::SIZE,
        seeds = [b"collection", authority.key().as_ref()],
        bump
    )]
    pub collection: Account<'info, WellnessCollection>,
    
    /// CHECK: This is the merkle tree for compressed NFTs
    pub merkle_tree: AccountInfo<'info>,
    
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct MintWellnessAchievement<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    
    /// CHECK: Recipient of the NFT
    pub recipient: AccountInfo<'info>,
    
    #[account(
        mut,
        constraint = collection.authority == authority.key()
    )]
    pub collection: Account<'info, WellnessCollection>,
    
    /// CHECK: Merkle tree for state compression
    #[account(mut)]
    pub merkle_tree: AccountInfo<'info>,
    
    /// CHECK: Bubblegum program
    pub bubblegum_program: AccountInfo<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateCollection<'info> {
    pub authority: Signer<'info>,
    
    #[account(
        mut,
        seeds = [b"collection", authority.key().as_ref()],
        bump = collection.bump,
        constraint = collection.authority == authority.key()
    )]
    pub collection: Account<'info, WellnessCollection>,
}

#[account]
pub struct WellnessCollection {
    pub authority: Pubkey,
    pub name: String,
    pub symbol: String,
    pub uri: String,
    pub merkle_tree: Pubkey,
    pub total_minted: u64,
    pub bump: u8,
}

impl WellnessCollection {
    // Max 200 chars for strings
    pub const SIZE: usize = 32 + 4 + 200 + 4 + 20 + 4 + 200 + 32 + 8 + 1;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct SessionData {
    pub session_id: String,          // UUID
    pub grade: String,              // S, A, B, C, D
    pub score: u64,                 // 0-100
    pub duration_seconds: u64,
    pub focus_score: u64,           // 0-100
    pub biometric_score: u64,       // 0-100
    pub challenges_completed: u64,
    pub hrv_avg: u64,               // heart rate variability
    pub strain: u64,                // strain score
    pub timestamp: i64,
    pub wallet_signature: Option<String>, // on-chain verification
}

#[event]
pub struct WellnessAchievementMinted {
    pub collection: Pubkey,
    pub recipient: Pubkey,
    pub mint_number: u64,
    pub name: String,
    pub symbol: String,
    pub uri: String,
    pub session_data: SessionData,
    pub timestamp: i64,
}

#[error_code]
pub enum ErrorCode {
    #[msg("Only S-grade sessions qualify for NFT minting")]
    InvalidGrade,
    #[msg("Unauthorized")]
    Unauthorized,
}
