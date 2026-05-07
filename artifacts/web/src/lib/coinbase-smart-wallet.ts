import { createCoinbaseWalletSDK, type ProviderInterface } from '@coinbase/wallet-sdk';
import { createPublicClient, createWalletClient, custom, http, type EIP1193Provider } from 'viem';
import { activeChain, base, baseSepolia } from '@/lib/chains';

let cachedSdk: ReturnType<typeof createCoinbaseWalletSDK> | null = null;
let cachedProvider: ProviderInterface | null = null;

function ensureSdk() {
  if (cachedSdk) return cachedSdk;
  cachedSdk = createCoinbaseWalletSDK({
    appName: 'Bioledger',
    appLogoUrl: window.location.origin + '/icon-192.png',
    appChainIds: [base.id, baseSepolia.id],
    preference: {
      options: 'smartWalletOnly',
    },
  });
  return cachedSdk;
}

export function getCoinbaseSmartWalletProvider(): ProviderInterface {
  if (cachedProvider) return cachedProvider;
  cachedProvider = ensureSdk().getProvider();
  return cachedProvider;
}

export async function connectCoinbaseSmartWallet(): Promise<{
  address: `0x${string}`;
  provider: EIP1193Provider;
  chainId: number;
}> {
  const provider = getCoinbaseSmartWalletProvider();
  const accounts = (await provider.request({
    method: 'eth_requestAccounts',
  })) as `0x${string}`[];

  if (!accounts?.[0]) {
    throw new Error('Coinbase Smart Wallet returned no accounts');
  }

  const chainHex = (await provider.request({ method: 'eth_chainId' })) as string;
  const chainId = parseInt(chainHex, 16);

  const desiredChainId = activeChain.id;
  if (chainId !== desiredChainId) {
    try {
      await provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${desiredChainId.toString(16)}` }],
      });
    } catch (err) {
      console.warn('[Coinbase Smart Wallet] Chain switch declined:', err);
    }
  }

  return {
    address: accounts[0],
    provider: provider as unknown as EIP1193Provider,
    chainId,
  };
}

export async function disconnectCoinbaseSmartWallet(): Promise<void> {
  if (!cachedProvider) return;
  try {
    await cachedProvider.disconnect?.();
  } catch (err) {
    console.warn('[Coinbase Smart Wallet] Disconnect error:', err);
  }
  cachedProvider = null;
}

export function getPublicClient() {
  return createPublicClient({
    chain: activeChain,
    transport: http(),
  });
}

export function getWalletClientFromProvider(provider: EIP1193Provider) {
  return createWalletClient({
    chain: activeChain,
    transport: custom(provider),
  });
}
