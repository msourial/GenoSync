import { createPublicClient, createWalletClient, custom, encodeFunctionData, http, parseEther, formatEther, type EIP1193Provider } from 'viem';
import { activeChain } from '@/lib/chains';
import { AURA_TOKEN_ABI } from '@/contracts/abi';
import { PAYMASTER_URL, isPaymasterEnabled } from '@/lib/coinbase-smart-wallet';

// Contract address — set after deployment. For now use env var or fallback.
const AURA_TOKEN_ADDRESS = (import.meta.env.VITE_AURA_TOKEN_ADDRESS as `0x${string}` | undefined)
  ?? '0x0000000000000000000000000000000000000000';

const publicClient = createPublicClient({
  chain: activeChain,
  transport: http(),
});

/**
 * Get AURA token balance for an address
 */
export async function getAuraBalance(address: `0x${string}`): Promise<string> {
  try {
    const balance = await publicClient.readContract({
      address: AURA_TOKEN_ADDRESS,
      abi: AURA_TOKEN_ABI,
      functionName: 'balanceOf',
      args: [address],
    });
    return formatEther(balance as bigint);
  } catch (err) {
    console.warn('[AURA Token] Failed to read balance:', err);
    return '0';
  }
}

/**
 * Mint AURA tokens to an address (requires minter wallet).
 *
 * Path A — Coinbase Paymaster sponsored (when VITE_COINBASE_PAYMASTER_URL is set):
 *   uses EIP-5792 `wallet_sendCalls` with `paymasterService` capabilities, so
 *   the Coinbase Smart Wallet sends the userOp through the paymaster and the
 *   user pays no gas.
 *
 * Path B — user-paid fallback: standard `eth_sendTransaction` via writeContract.
 */
export async function mintAuraTokens(
  walletProvider: EIP1193Provider,
  toAddress: `0x${string}`,
  xpAmount: number,
): Promise<{ hash: string | null; amount: string; sponsored: boolean }> {
  if (AURA_TOKEN_ADDRESS === '0x0000000000000000000000000000000000000000') {
    return { hash: null, amount: String(xpAmount), sponsored: false };
  }

  const amount = parseEther(String(xpAmount)); // 1 XP = 1 AURA (18 decimals)
  const data = encodeFunctionData({
    abi: AURA_TOKEN_ABI,
    functionName: 'mint',
    args: [toAddress, amount],
  });

  try {
    const client = createWalletClient({
      chain: activeChain,
      transport: custom(walletProvider),
    });
    const [account] = await client.getAddresses();
    if (!account) {
      return { hash: null, amount: String(xpAmount), sponsored: false };
    }

    // Path A — try paymaster-sponsored userOp via EIP-5792 capabilities.
    if (isPaymasterEnabled()) {
      try {
        const callId = await (walletProvider.request as (args: { method: string; params: unknown[] }) => Promise<string>)({
          method: 'wallet_sendCalls',
          params: [
            {
              version: '1.0',
              chainId: `0x${activeChain.id.toString(16)}`,
              from: account,
              calls: [{ to: AURA_TOKEN_ADDRESS, data, value: '0x0' }],
              capabilities: {
                paymasterService: { url: PAYMASTER_URL },
              },
            },
          ],
        });
        console.log(`AURA Token: Sponsored mint of ${xpAmount} AURA to ${toAddress} — callId: ${callId}`);
        return { hash: callId, amount: String(xpAmount), sponsored: true };
      } catch (err) {
        console.warn('[AURA Token] Paymaster path failed, falling back to user-paid:', err);
      }
    }

    // Path B — user-paid.
    const hash = await client.writeContract({
      account,
      address: AURA_TOKEN_ADDRESS,
      abi: AURA_TOKEN_ABI,
      functionName: 'mint',
      args: [toAddress, amount],
    });
    console.log(`AURA Token: User-paid mint of ${xpAmount} AURA to ${toAddress} — tx: ${hash}`);
    return { hash, amount: String(xpAmount), sponsored: false };
  } catch (err) {
    console.warn('[AURA Token] Mint failed (XP tracked off-chain regardless):', err);
    return { hash: null, amount: String(xpAmount), sponsored: false };
  }
}

/**
 * Check if token contract is deployed and accessible
 */
export async function isTokenDeployed(): Promise<boolean> {
  if (AURA_TOKEN_ADDRESS === '0x0000000000000000000000000000000000000000') return false;
  try {
    await publicClient.readContract({
      address: AURA_TOKEN_ADDRESS,
      abi: AURA_TOKEN_ABI,
      functionName: 'name',
    });
    return true;
  } catch {
    return false;
  }
}
