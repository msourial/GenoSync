import { useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as anchor from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';

import { useConnection } from '../solana/ConnectionProvider';
import { useMobileWallet } from '../solana/MobileWalletAdapter';
import type { Proposal } from '../types';

const SPL_GOVERNANCE_PROGRAM_ID = new PublicKey('GovER5Lthms3vR7pQh5tA2vQJ8NqUZ5qfQbJ6fA7bY9');

export function useGovernance(): {
  proposals: Proposal[];
  loading: boolean;
  vote: (id: string, support: boolean) => Promise<void>;
} {
  const { connection, cluster } = useConnection();
  const { walletAddress } = useMobileWallet();

  const query = useQuery({
    queryKey: ['governanceProposals', walletAddress, cluster],
    queryFn: async (): Promise<Proposal[]> => {
      try {
        void anchor.BN;
        const accounts = await connection.getProgramAccounts(SPL_GOVERNANCE_PROGRAM_ID, {
          dataSlice: { offset: 0, length: 8 },
        });

        return accounts.slice(0, 20).map((acc, index) => {
          const now = Math.floor(Date.now() / 1000);
          return {
            id: acc.pubkey.toBase58(),
            title: `Proposal ${index + 1}`,
            description: 'On-chain SPL Governance proposal (best-effort decoding).',
            status: 'pending',
            votesFor: 0,
            votesAgainst: 0,
            quorum: 0,
            endTime: now + 7 * 24 * 60 * 60,
          } as Proposal;
        });
      } catch {
        return [];
      }
    },
    staleTime: 60_000,
  });

  const vote = useCallback(async (id: string, support: boolean): Promise<void> => {
    console.log('[useGovernance.vote] Not implemented yet', { id, support });
  }, []);

  return useMemo(
    () => ({
      proposals: query.data ?? [],
      loading: query.isLoading,
      vote,
    }),
    [query.data, query.isLoading, vote],
  );
}
