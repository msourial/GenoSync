import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Staking } from "../target/types/staking";

// Solana Program Configuration
export const PROGRAM_ID = new anchor.web3.PublicKey("GNSYn111111111111111111111111111111111111111");

export function getProvider() {
  const connection = new anchor.web3.Connection("https://api.devnet.solana.com");
  const wallet = anchor.Wallet.local();
  return new anchor.AnchorProvider(connection, wallet, {});
}
