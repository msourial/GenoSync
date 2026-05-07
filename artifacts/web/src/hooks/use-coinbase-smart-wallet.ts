import { useCallback, useEffect, useState } from 'react';
import {
  connectCoinbaseSmartWallet,
  disconnectCoinbaseSmartWallet,
  getCoinbaseSmartWalletProvider,
} from '@/lib/coinbase-smart-wallet';
import type { EIP1193Provider } from 'viem';

const STORAGE_KEY = 'genosync_cbw_address';

export type CoinbaseSmartWalletState = {
  address: `0x${string}` | null;
  chainId: number | null;
  connecting: boolean;
  error: string | null;
  connect: () => Promise<`0x${string}` | null>;
  disconnect: () => Promise<void>;
  getProvider: () => EIP1193Provider | null;
};

export function useCoinbaseSmartWallet(): CoinbaseSmartWalletState {
  const [address, setAddress] = useState<`0x${string}` | null>(() => {
    const cached = localStorage.getItem(STORAGE_KEY);
    return (cached as `0x${string}` | null) ?? null;
  });
  const [chainId, setChainId] = useState<number | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connect = useCallback(async () => {
    setConnecting(true);
    setError(null);
    try {
      const result = await connectCoinbaseSmartWallet();
      setAddress(result.address);
      setChainId(result.chainId);
      localStorage.setItem(STORAGE_KEY, result.address);
      return result.address;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to connect Coinbase Smart Wallet';
      setError(message);
      console.warn('[Coinbase Smart Wallet] connect error:', err);
      return null;
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(async () => {
    await disconnectCoinbaseSmartWallet();
    setAddress(null);
    setChainId(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const getProvider = useCallback(() => {
    try {
      return getCoinbaseSmartWalletProvider() as unknown as EIP1193Provider;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    const provider = getProvider() as unknown as {
      on?: (event: string, handler: (raw: unknown) => void) => void;
      removeListener?: (event: string, handler: (raw: unknown) => void) => void;
    } | null;
    if (!provider) return;
    const onAccounts = (accounts: unknown) => {
      const list = accounts as `0x${string}`[];
      if (!list?.[0]) {
        setAddress(null);
        localStorage.removeItem(STORAGE_KEY);
      } else {
        setAddress(list[0]);
        localStorage.setItem(STORAGE_KEY, list[0]);
      }
    };
    const onChain = (raw: unknown) => {
      const hex = String(raw);
      setChainId(parseInt(hex, 16));
    };
    provider.on?.('accountsChanged', onAccounts);
    provider.on?.('chainChanged', onChain);
    return () => {
      provider.removeListener?.('accountsChanged', onAccounts);
      provider.removeListener?.('chainChanged', onChain);
    };
  }, [getProvider]);

  return { address, chainId, connecting, error, connect, disconnect, getProvider };
}
