import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAssociatedTokenAddress } from '@solana/spl-token';
import { PublicKey } from '@solana/web3.js';

import { useConnection } from '../solana/ConnectionProvider';
import { useMobileWallet } from '../solana/MobileWalletAdapter';

const getEnv = (key: string): string => {
  const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env;
  return env?.[key] ?? '';
};

export function useAuraBalance(): {
  balance: number;
  loading: boolean;
  refetch: () => void;
} {
  const { connection, cluster } = useConnection();
  const { walletPublicKey, walletAddress } = useMobileWallet();

  const auraMintAddress = getEnv('EXPO_PUBLIC_AURA_MINT').trim();
  if (!auraMintAddress) {
    return {
      balance: 0,
      loading: false,
      refetch: () => {},
    };
  }

  let auraMint: PublicKey | null = null;
  try {
    auraMint = new PublicKey(auraMintAddress);
  } catch {
    auraMint = null;
  }

  const query = useQuery({
    queryKey: ['auraBalance', walletAddress, cluster, auraMintAddress],
    enabled: !!walletPublicKey && !!auraMint,
    queryFn: async (): Promise<number> => {
      if (!walletPublicKey || !auraMint) return 0;

      try {
        const ata = await getAssociatedTokenAddress(auraMint, walletPublicKey);
        const tokenBalance = await connection.getTokenAccountBalance(ata);
        const amount = Number(tokenBalance.value.uiAmount ?? 0);
        return Number.isFinite(amount) ? amount : 0;
      } catch {
        return 0;
      }
    },
    staleTime: 15_000,
  });

  const refetch = useCallback(() => {
    void query.refetch();
  }, [query]);

  return {
    balance: query.data ?? 0,
    loading: query.isLoading,
    refetch,
  };
}
