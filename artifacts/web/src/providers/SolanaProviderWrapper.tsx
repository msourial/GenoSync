import { useMemo, type ReactNode } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom';
import { clusterApiUrl } from '@solana/web3.js';
import '@solana/wallet-adapter-react-ui/styles.css';

const SOLANA_CLUSTER =
  ((import.meta.env.VITE_SOLANA_CLUSTER as string | undefined) ?? 'devnet').toLowerCase() as
    | 'mainnet-beta'
    | 'devnet'
    | 'testnet';

const SOLANA_RPC_OVERRIDE = (import.meta.env.VITE_SOLANA_RPC_URL as string | undefined)?.trim();

export default function SolanaProviderWrapper({ children }: { children: ReactNode }) {
  const endpoint = useMemo(
    () => (SOLANA_RPC_OVERRIDE && SOLANA_RPC_OVERRIDE.length > 0
      ? SOLANA_RPC_OVERRIDE
      : clusterApiUrl(SOLANA_CLUSTER)),
    [],
  );
  const wallets = useMemo(() => [new PhantomWalletAdapter()], []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect={false}>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

export { SOLANA_CLUSTER };
