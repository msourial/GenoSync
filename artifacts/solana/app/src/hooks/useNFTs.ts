import { useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';

import { useConnection } from '../solana/ConnectionProvider';
import { useMobileWallet } from '../solana/MobileWalletAdapter';
import type { NFTItem } from '../types';

const shorten = (mint: string): string => `${mint.slice(0, 4)}...${mint.slice(-4)}`;

export function useNFTs(): {
  nfts: { mint: string; name: string; image?: string; grade?: 'S' | 'A' | 'B' | 'C' | 'D' }[];
  loading: boolean;
  refetch: () => void;
} {
  const { connection, cluster } = useConnection();
  const { walletPublicKey, walletAddress } = useMobileWallet();

  const query = useQuery({
    queryKey: ['nfts', walletAddress, cluster],
    enabled: !!walletPublicKey,
    queryFn: async (): Promise<NFTItem[]> => {
      if (!walletPublicKey) return [];

      try {
        const response = await connection.getParsedTokenAccountsByOwner(walletPublicKey, {
          programId: TOKEN_PROGRAM_ID,
        });

        return response.value
          .filter((acc) => {
            const parsed = acc.account.data;
            if (!parsed || typeof parsed !== 'object' || !('parsed' in parsed)) return false;

            const tokenAmount = (parsed as { parsed?: { info?: { tokenAmount?: { decimals?: number; amount?: string; uiAmount?: number | null } } } })
              .parsed?.info?.tokenAmount;

            if (!tokenAmount) return false;
            const isNftAmount = tokenAmount.amount === '1' || tokenAmount.uiAmount === 1;
            return tokenAmount.decimals === 0 && isNftAmount;
          })
          .map((acc) => {
            const parsed = acc.account.data as { parsed?: { info?: { mint?: string } } };
            const mint = parsed.parsed?.info?.mint ?? '';
            return {
              mint,
              name: shorten(mint),
              image: undefined,
              grade: undefined,
            } as NFTItem;
          })
          .filter((item) => item.mint.length > 0);
      } catch {
        return [];
      }
    },
    staleTime: 30_000,
  });

  const nfts = useMemo(() => query.data ?? [], [query.data]);
  const refetch = useCallback(() => {
    void query.refetch();
  }, [query]);

  return {
    nfts,
    loading: query.isLoading,
    refetch,
  };
}
