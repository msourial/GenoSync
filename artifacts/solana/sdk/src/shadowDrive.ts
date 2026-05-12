import { ShdwDrive } from '@shadow-drive/sdk';
import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import * as anchor from '@project-serum/anchor';

/**
 * GenoSync Shadow Drive Integration
 * 
 * Shadow Drive provides decentralized, permanent storage for wellness receipts
 * at a fraction of the cost of traditional decentralized storage.
 * 
 * Key features:
 * - 1GB+ storage per account
 * - ~$0.10/GB/month
 * - On-chain storage accounts
 * - Content-addressed files
 */

export interface WellnessReceipt {
  specVersion: string;
  receiptType: string;
  timestamp: string;
  walletAddress: string;
  nullifierHash?: string;
  sessionStats: {
    durationSeconds: number;
    apm: number;
    hrv: number;
    strain: number;
    focusScore: number;
  };
  erc8004: {
    agent_id: string;
    certified_human_presence: boolean;
    focus_fidelity_score: number;
    avg_blink_rate: number;
    head_stability: number;
  };
  grade: {
    letter: 'S' | 'A' | 'B' | 'C' | 'D';
    score: number;
    xpBonus: number;
  };
  signature: string;
  previousReceiptCid?: string;
}

export interface StoredReceipt {
  cid: string;
  url: string;
  timestamp: number;
  walletAddress: string;
}

export class GenoSyncStorage {
  private drive: ShdwDrive | null = null;
  private storageAccount: PublicKey | null = null;
  private connection: Connection;
  private wallet: anchor.Wallet;

  constructor(
    connection: Connection,
    wallet: anchor.Wallet
  ) {
    this.connection = connection;
    this.wallet = wallet;
  }

  /**
   * Initialize the Shadow Drive connection
   */
  async initialize(): Promise<void> {
    this.drive = await new ShdwDrive(this.connection, this.wallet).init();
    console.log('[ShadowDrive] SDK initialized');
  }

  /**
   * Create a new storage account
   * @param name Human-readable name for the account
   * @param size Size in MB (minimum 1GB for best value)
   */
  async createStorageAccount(
    name: string = 'genosync-receipts',
    size: string = '1GB'
  ): Promise<PublicKey> {
    if (!this.drive) {
      throw new Error('Shadow Drive not initialized. Call initialize() first.');
    }

    try {
      // Create storage account
      const response = await this.drive.createStorageAccount(name, size);
      this.storageAccount = response.shdw_bucket;
      
      console.log('[ShadowDrive] Storage account created:', this.storageAccount.toString());
      console.log('[ShadowDrive] Transaction:', response.transaction_signature);
      
      return this.storageAccount;
    } catch (error) {
      console.error('[ShadowDrive] Failed to create storage account:', error);
      throw error;
    }
  }

  /**
   * Store a wellness receipt on Shadow Drive
   * @param receipt The wellness receipt data
   * @returns The CID and URL of the stored receipt
   */
  async storeReceipt(receipt: WellnessReceipt): Promise<StoredReceipt> {
    if (!this.drive || !this.storageAccount) {
      throw new Error('Shadow Drive not initialized or no storage account');
    }

    try {
      // Convert receipt to JSON
      const receiptJson = JSON.stringify(receipt, null, 2);
      const blob = new Blob([receiptJson], { type: 'application/json' });
      const file = new File([blob], `receipt-${receipt.timestamp}.json`);

      // Upload file
      const response = await this.drive.uploadFile(
        this.storageAccount,
        file,
        'genosync-receipts'
      );

      const stored: StoredReceipt = {
        cid: response.finalized_locations[0],
        url: `https://shdw-drive.genesysgo.net/${this.storageAccount.toString()}/${response.finalized_locations[0]}`,
        timestamp: Date.now(),
        walletAddress: receipt.walletAddress,
      };

      console.log('[ShadowDrive] Receipt stored:', stored.cid);
      console.log('[ShadowDrive] URL:', stored.url);

      return stored;
    } catch (error) {
      console.error('[ShadowDrive] Failed to store receipt:', error);
      throw error;
    }
  }

  /**
   * Retrieve a receipt by CID
   * @param cid The content identifier
   * @returns The wellness receipt data
   */
  async retrieveReceipt(cid: string): Promise<WellnessReceipt> {
    if (!this.storageAccount) {
      throw new Error('No storage account available');
    }

    const url = `https://shdw-drive.genesysgo.net/${this.storageAccount.toString()}/${cid}`;
    
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data: WellnessReceipt = await response.json();
      return data;
    } catch (error) {
      console.error('[ShadowDrive] Failed to retrieve receipt:', error);
      throw error;
    }
  }

  /**
   * List all files in the storage account
   */
  async listReceipts(): Promise<Array<{ name: string; cid: string }>> {
    if (!this.drive || !this.storageAccount) {
      throw new Error('Shadow Drive not initialized or no storage account');
    }

    try {
      const files = await this.drive.listObjects(this.storageAccount);
      return files.map(file => ({
        name: file.name,
        cid: file.id,
      }));
    } catch (error) {
      console.error('[ShadowDrive] Failed to list receipts:', error);
      throw error;
    }
  }

  /**
   * Delete a receipt (only account owner can delete)
   * @param cid Content identifier to delete
   */
  async deleteReceipt(cid: string): Promise<void> {
    if (!this.drive || !this.storageAccount) {
      throw new Error('Shadow Drive not initialized or no storage account');
    }

    try {
      await this.drive.deleteFile(this.storageAccount, cid);
      console.log('[ShadowDrive] Receipt deleted:', cid);
    } catch (error) {
      console.error('[ShadowDrive] Failed to delete receipt:', error);
      throw error;
    }
  }

  /**
   * Get storage account info
   */
  async getStorageInfo(): Promise<{
    account: PublicKey;
    size: number;
    used: number;
    available: number;
  }> {
    if (!this.drive || !this.storageAccount) {
      throw new Error('Shadow Drive not initialized or no storage account');
    }

    try {
      const accounts = await this.drive.getStorageAccounts('v2');
      const account = accounts.find(
        acc => acc.publicKey.toString() === this.storageAccount?.toString()
      );

      if (!account) {
        throw new Error('Storage account not found');
      }

      const accountInfo = await this.drive.getStorageAccount(this.storageAccount);
      
      return {
        account: this.storageAccount,
        size: accountInfo.storage_account.storage_used,
        used: accountInfo.storage_account.current_usage,
        available: accountInfo.storage_account.storage_available,
      };
    } catch (error) {
      console.error('[ShadowDrive] Failed to get storage info:', error);
      throw error;
    }
  }

  /**
   * Add storage capacity
   * @param additionalSize Size to add (e.g., "1GB")
   */
  async addStorage(additionalSize: string): Promise<void> {
    if (!this.drive || !this.storageAccount) {
      throw new Error('Shadow Drive not initialized or no storage account');
    }

    try {
      const response = await this.drive.addStorage(
        this.storageAccount,
        additionalSize
      );
      console.log('[ShadowDrive] Storage added:', additionalSize);
      console.log('[ShadowDrive] Transaction:', response.transaction_signature);
    } catch (error) {
      console.error('[ShadowDrive] Failed to add storage:', error);
      throw error;
    }
  }

  /**
   * Create a chain of receipts (linked list on Shadow Drive)
   * Each receipt references the previous one
   */
  async createReceiptChain(
    newReceipt: WellnessReceipt,
    previousCid?: string
  ): Promise<StoredReceipt> {
    if (previousCid) {
      newReceipt.previousReceiptCid = previousCid;
    }

    return this.storeReceipt(newReceipt);
  }

  /**
   * Get the full receipt chain for a wallet
   */
  async getReceiptChain(walletAddress: string): Promise<WellnessReceipt[]> {
    const allReceipts = await this.listReceipts();
    const chain: WellnessReceipt[] = [];

    // Fetch all receipts and filter by wallet
    for (const file of allReceipts) {
      try {
        const receipt = await this.retrieveReceipt(file.cid);
        if (receipt.walletAddress === walletAddress) {
          chain.push(receipt);
        }
      } catch (error) {
        console.warn('[ShadowDrive] Failed to fetch receipt:', file.cid);
      }
    }

    // Sort by timestamp
    chain.sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    return chain;
  }
}

/**
 * Helper function to estimate storage cost
 * @param gb Number of gigabytes
 * @returns Estimated cost in USD
 */
export function estimateStorageCost(gb: number): number {
  // Shadow Drive: ~$0.10/GB/month
  const costPerGB = 0.10;
  return gb * costPerGB;
}

/**
 * Compare Shadow Drive to other storage options
 */
export const storageComparison = {
  shadowDrive: { costPerGB: 0.10, speed: 'fast', permanence: 'high' },
  filecoin: { costPerGB: 5.0, speed: 'slow', permanence: 'very high' },
  arweave: { costPerGB: 8.0, speed: 'medium', permanence: 'permanent' },
  ipfs: { costPerGB: 0.0, speed: 'fast', permanence: 'low' },
};
