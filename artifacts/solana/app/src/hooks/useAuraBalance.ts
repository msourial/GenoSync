import { useEffect, useState } from 'react';
import { useMobileWallet } from '../solana/MobileWalletAdapter';
import { useConnection } from '../solana/ConnectionProvider';
import { PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddress, getAccount, Account } from '@solana/spl-token';

// AURA SPL Token mint address (update after deployment)
const AURA_TOKEN_MINT = new PublicKey('AuraMintAddress111111111111111111111111111111');

/**
 * Hook to fetch AURA token balance for the connected wallet
 */
export function useAuraBalance() {
  const { walletPublicKey } = useMobileWallet();
  const { connection } = useConnection();
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!walletPublicKey) {
      setBalance(0);
      return;
    }

    const fetchBalance = async () => {
      setLoading(true);
      try {
        const ata = await getAssociatedTokenAddress(AURA_TOKEN_MINT, walletPublicKey);
        try {
          const account: Account = await getAccount(connection, ata);
          // SPL tokens have decimals, assuming 9 for AURA
          setBalance(Number(account.amount) / 1e9);
        } catch {
          // Account doesn't exist - no tokens yet
          setBalance(0);
        }
      } catch (err) {
        console.error('Failed to fetch AURA balance:', err);
        setBalance(0);
      } finally {
        setLoading(false);
      }
    };

    fetchBalance();
    
    // Poll every 15 seconds
    const interval = setInterval(fetchBalance, 15000);
    return () => clearInterval(interval);
  }, [walletPublicKey, connection]);

  return { balance, loading };
}
