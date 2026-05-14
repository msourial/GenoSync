import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { ParsedInstruction, PartiallyDecodedInstruction } from '@solana/web3.js';

import { useConnection } from '../solana/ConnectionProvider';
import { useMobileWallet } from '../solana/MobileWalletAdapter';
import type { SessionRecord } from '../types';

type MemoPayload = {
  hrv?: number;
  strain?: number;
  auraEarned?: number;
  duration?: number;
  challenges?: string[];
};

const parseMemo = (rawMemo: string | null): MemoPayload => {
  if (!rawMemo) return {};
  try {
    const parsed = JSON.parse(rawMemo) as MemoPayload;
    return parsed;
  } catch {
    return {};
  }
};

const extractMemoFromInstruction = (instruction: ParsedInstruction | PartiallyDecodedInstruction): string | null => {
  if ('parsed' in instruction) {
    const parsedUnknown = instruction.parsed as unknown;
    if (typeof parsedUnknown === 'string') return parsedUnknown;
    if (parsedUnknown && typeof parsedUnknown === 'object' && 'memo' in (parsedUnknown as Record<string, unknown>)) {
      const memoValue = (parsedUnknown as Record<string, unknown>).memo;
      return typeof memoValue === 'string' ? memoValue : null;
    }
    return null;
  }

  if ('data' in instruction && typeof instruction.data === 'string') {
    return null;
  }

  return null;
};

export function useHistory(): {
  records: SessionRecord[];
  loading: boolean;
} {
  const { connection, cluster } = useConnection();
  const { walletPublicKey, walletAddress } = useMobileWallet();

  const query = useQuery({
    queryKey: ['history', walletAddress, cluster],
    enabled: !!walletPublicKey,
    queryFn: async (): Promise<SessionRecord[]> => {
      if (!walletPublicKey) return [];

      try {
        const signatures = await connection.getSignaturesForAddress(walletPublicKey, { limit: 20 });

        const records = await Promise.all(
          signatures.map(async (sigInfo): Promise<SessionRecord> => {
            let memoPayload: MemoPayload = {};

            try {
              const tx = await connection.getParsedTransaction(sigInfo.signature, {
                maxSupportedTransactionVersion: 0,
              });

              const instructions = tx?.transaction.message.instructions ?? [];
              const memoInstruction = instructions.find((ix) => 'program' in ix && ix.program === 'spl-memo');

              if (memoInstruction) {
                const memoRaw = extractMemoFromInstruction(memoInstruction as ParsedInstruction | PartiallyDecodedInstruction);
                memoPayload = parseMemo(memoRaw);
              }
            } catch {
              memoPayload = {};
            }

            const date = sigInfo.blockTime
              ? new Date(sigInfo.blockTime * 1000).toISOString()
              : new Date().toISOString();

            return {
              id: sigInfo.signature,
              date,
              duration: typeof memoPayload.duration === 'number' ? memoPayload.duration : 0,
              grade: 'C',
              hrv: typeof memoPayload.hrv === 'number' ? memoPayload.hrv : 0,
              strain: typeof memoPayload.strain === 'number' ? memoPayload.strain : 0,
              auraEarned: typeof memoPayload.auraEarned === 'number' ? memoPayload.auraEarned : 0,
              challenges: Array.isArray(memoPayload.challenges) ? memoPayload.challenges : [],
            };
          }),
        );

        return records;
      } catch {
        return [];
      }
    },
    staleTime: 30_000,
  });

  return useMemo(
    () => ({
      records: query.data ?? [],
      loading: query.isLoading,
    }),
    [query.data, query.isLoading],
  );
}
