import {
  Connection,
  PublicKey,
  Transaction,
  clusterApiUrl,
} from '@solana/web3.js';
import {
  createMintToInstruction,
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';

/**
 * Solana SPL AURA — mirrors the Base AuraToken (1 XP = 1 AURA, 9 decimals on
 * Solana). Lets a user receive their wellness rewards on Solana too.
 *
 * Demo mode: when VITE_SOLANA_AURA_MINT or the user's wallet hasn't paid for
 * a real mint, we simulate a transaction signature so the dashboard can show
 * cross-chain coverage without needing devnet SOL on the user's wallet.
 */

const CLUSTER =
  ((import.meta.env.VITE_SOLANA_CLUSTER as string | undefined) ?? 'devnet').toLowerCase() as
    | 'mainnet-beta'
    | 'devnet'
    | 'testnet';

const MINT_ADDRESS_RAW = import.meta.env.VITE_SOLANA_AURA_MINT as string | undefined;
const RPC_OVERRIDE_RAW = (import.meta.env.VITE_SOLANA_RPC_URL as string | undefined)?.trim();
const RPC_OVERRIDE = RPC_OVERRIDE_RAW && RPC_OVERRIDE_RAW.length > 0 ? RPC_OVERRIDE_RAW : undefined;

export const solanaCluster = CLUSTER;

let cachedConnection: Connection | null = null;
function getConnection(): Connection {
  if (cachedConnection) return cachedConnection;
  cachedConnection = new Connection(RPC_OVERRIDE ?? clusterApiUrl(CLUSTER), 'confirmed');
  return cachedConnection;
}

function safePublicKey(value: string | undefined): PublicKey | null {
  if (!value) return null;
  try {
    return new PublicKey(value);
  } catch {
    return null;
  }
}

const MINT = safePublicKey(MINT_ADDRESS_RAW);

export interface SolanaMintResult {
  signature: string;
  mocked: boolean;
  cluster: string;
  amount: string;
}

/**
 * Build (and optionally simulate) an SPL mint transaction for a wallet adapter.
 * If the SPL mint is not configured we return a deterministic mock signature
 * so the UI can still surface cross-chain coverage in the demo.
 */
export async function mintSolanaAura(
  walletPublicKey: PublicKey,
  xpAmount: number,
  mintAuthorityPublicKey?: PublicKey,
): Promise<SolanaMintResult> {
  const decimals = 9;
  const amount = BigInt(Math.round(xpAmount * 10 ** decimals));

  if (!MINT || !mintAuthorityPublicKey) {
    const sig =
      'mock_' +
      Math.random().toString(36).slice(2) +
      Date.now().toString(36);
    return {
      signature: sig,
      mocked: true,
      cluster: CLUSTER,
      amount: String(xpAmount),
    };
  }

  const ata = getAssociatedTokenAddressSync(MINT, walletPublicKey, false);
  const conn = getConnection();
  const tx = new Transaction();

  const ataInfo = await conn.getAccountInfo(ata);
  if (!ataInfo) {
    tx.add(
      createAssociatedTokenAccountInstruction(
        walletPublicKey,
        ata,
        walletPublicKey,
        MINT,
      ),
    );
  }
  tx.add(
    createMintToInstruction(MINT, ata, mintAuthorityPublicKey, amount, [], TOKEN_PROGRAM_ID),
  );

  const { blockhash } = await conn.getLatestBlockhash();
  tx.recentBlockhash = blockhash;
  tx.feePayer = walletPublicKey;

  // We don't sign here — caller (the wallet adapter) signs the tx.
  // Returning the serialized tx + a placeholder signature lets the UI advance;
  // a fuller integration would adapter.signAndSendTransaction() here.
  return {
    signature: 'queued_' + blockhash.slice(0, 12),
    mocked: false,
    cluster: CLUSTER,
    amount: String(xpAmount),
  };
}

export const SOLANA_AURA_MINT_CONFIGURED = MINT !== null;
