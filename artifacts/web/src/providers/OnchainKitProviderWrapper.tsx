import { type ReactNode } from 'react';
import { OnchainKitProvider } from '@coinbase/onchainkit';
import { activeChain, base, baseSepolia } from '@/lib/chains';

const ONCHAINKIT_API_KEY = import.meta.env.VITE_ONCHAINKIT_API_KEY as string | undefined;
const PAYMASTER_URL = import.meta.env.VITE_COINBASE_PAYMASTER_URL as string | undefined;

export default function OnchainKitProviderWrapper({ children }: { children: ReactNode }) {
  // Pick the activeChain but fall back to baseSepolia/base if user hits Flow path.
  const ockChain = activeChain.id === base.id ? base : baseSepolia;

  return (
    <OnchainKitProvider
      apiKey={ONCHAINKIT_API_KEY}
      chain={ockChain}
      config={{
        appearance: {
          mode: 'dark',
          theme: 'cyberpunk',
          name: 'GenoSync',
        },
        wallet: {
          display: 'modal',
          preference: 'smartWalletOnly',
        },
        paymaster: PAYMASTER_URL,
      }}
    >
      {children}
    </OnchainKitProvider>
  );
}
