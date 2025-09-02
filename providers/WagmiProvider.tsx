'use client';

import { createConfig, http, WagmiProvider } from 'wagmi';
import { base } from 'wagmi/chains';
import { farcasterMiniApp } from '@farcaster/miniapp-wagmi-connector';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';

// Create Wagmi config with Farcaster connector for MiniKit support
const wagmiConfig = createConfig({
  chains: [base],
  transports: {
    [base.id]: http(),
  },
  connectors: [
    farcasterMiniApp()
  ]
});

// Create a separate QueryClient for Wagmi to avoid conflicts
const wagmiQueryClient = new QueryClient();

export function WagmiContextProvider({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={wagmiQueryClient}>
      <WagmiProvider config={wagmiConfig}>
        {children}
      </WagmiProvider>
    </QueryClientProvider>
  );
}