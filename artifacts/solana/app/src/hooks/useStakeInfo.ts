import { useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { PublicKey } from '@solana/web3.js';

import { useConnection } from '../solana/ConnectionProvider';
import { useMobileWallet } from '../solana/MobileWalletAdapter';
import type { StakeInfo } from '../stores/stakingStore';

const PROGRAM_ID = new PublicKey('GNSYstk111111111111111111111111111111111111');

const readBigInt64LE = (buffer: Buffer, offset: number): bigint => {
  const u = buffer.readBigUInt64LE(offset);
  const maxInt64 = 0x7fffffffffffffffn;
  return u <= maxInt64 ? BigInt(u) : BigInt(u) - 0x10000000000000000n;
};

export function useStakeInfo(): {
  stakeInfo: StakeInfo | null;
  loading: boolean;
  refetch: () => void;
} {
  const { connection, cluster } = useConnection();
  const { walletPublicKey, walletAddress } = useMobileWallet();

  const query = useQuery({
    queryKey: ['stakeInfo', walletAddress, cluster],
    enabled: !!walletPublicKey,
    queryFn: async (): Promise<StakeInfo | null> => {
      if (!walletPublicKey) return null;

      try {
        const [stakePda] = PublicKey.findProgramAddressSync(
          [Buffer.from('stake', 'utf8'), walletPublicKey.toBuffer()],
          PROGRAM_ID,
        );

        const account = await connection.getAccountInfo(stakePda);
        if (!account?.data || account.data.length < 27) {
          return null;
        }

        const data = account.data;
        const amountRaw = data.readBigUInt64LE(0);
        const lockupPeriod = data.readUInt8(8);
        const lockupEnd = readBigInt64LE(data, 9);
        const boostMultiplierRaw = data.readUInt16LE(17);
        const stakedAt = readBigInt64LE(data, 19);

        return {
          amount: Number(amountRaw),
          lockupPeriod,
          lockupEnd: Number(lockupEnd),
          boostMultiplier: boostMultiplierRaw / 100,
          stakedAt: Number(stakedAt),
          pda: stakePda.toBase58(),
        };
      } catch {
        return null;
      }
    },
    staleTime: 20_000,
  });

  const refetch = useCallback(() => {
    void query.refetch();
  }, [query]);

  return useMemo(
    () => ({
      stakeInfo: query.data ?? null,
      loading: query.isLoading,
      refetch,
    }),
    [query.data, query.isLoading, refetch],
  );
}
