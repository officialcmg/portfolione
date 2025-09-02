'use client';
import { MiniKitProvider } from '@coinbase/onchainkit/minikit';
import { ReactNode } from 'react';

// Define base chain config to avoid viem version conflicts
const baseChain = {
  id: 8453,
  name: 'Base',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://mainnet.base.org'] },
  },
  blockExplorers: {
    default: { name: 'BaseScan', url: 'https://basescan.org' },
  },
} as const;

export function MiniKitContextProvider({ children }: { children: ReactNode }) {
  return (
    <MiniKitProvider 
      apiKey={process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY}
      chain={baseChain}
    >
      {children}
    </MiniKitProvider>
  );
}