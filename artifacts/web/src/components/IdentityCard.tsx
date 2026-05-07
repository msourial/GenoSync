import {
  Avatar,
  Name,
  Identity,
  Address,
  EthBalance,
  Badge,
} from '@coinbase/onchainkit/identity';
import { activeChain } from '@/lib/chains';

interface IdentityCardProps {
  walletAddress: string;
}

/**
 * Coinbase OnchainKit Identity component — shows the user's
 * onchain identity (avatar, basename / ENS, address, balance, attestations).
 *
 * Reads from the active chain (Base or Base Sepolia).
 */
export default function IdentityCard({ walletAddress }: IdentityCardProps) {
  return (
    <div className="rounded-xl border border-blue-500/30 bg-gradient-to-br from-blue-500/10 to-indigo-500/5 p-4">
      <div className="flex items-center gap-2 mb-3">
        <span className="font-pixel text-[7px] text-blue-300/70 tracking-widest">
          ONCHAIN IDENTITY
        </span>
        <span className="font-pixel text-[7px] text-muted-foreground/40">
          · {activeChain.name.toUpperCase()}
        </span>
      </div>
      <Identity
        address={walletAddress as `0x${string}`}
        schemaId="0xf8b05c79f090979bf4a80270aba232dff11a10d9ca55c4f88de95317970f0de9"
      >
        <div className="flex items-center gap-3">
          <Avatar className="w-10 h-10 rounded-full" />
          <div className="flex flex-col">
            <Name className="font-terminal text-sm font-semibold text-blue-200">
              <Badge tooltip="Coinbase Verified" />
            </Name>
            <Address className="font-mono text-[11px] text-blue-300/60" />
          </div>
        </div>
        <div className="mt-2 pt-2 border-t border-blue-500/20 flex items-center justify-between">
          <span className="font-pixel text-[7px] text-blue-300/50 tracking-widest">
            BALANCE
          </span>
          <EthBalance className="font-mono text-xs text-blue-200" />
        </div>
      </Identity>
    </div>
  );
}
