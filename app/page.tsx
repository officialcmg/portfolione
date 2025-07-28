"use client";

import { useSignerStatus } from "@account-kit/react";
import Header from "./components/header";
import { formatAddress } from "@/lib/utils";
import { useUser, useSmartAccountClient } from "@account-kit/react";

export default function Home() {
  const signerStatus = useSignerStatus();
  const user = useUser();
  const userEmail = user?.email ?? "anon";
  const { client } = useSmartAccountClient({});

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <Header />
      <div className="bg-bg-main bg-cover bg-center bg-no-repeat h-[calc(100vh-4rem)]">
        <main className="container mx-auto px-4 py-8 flex-1 flex items-center justify-center">
          <div className="text-center max-w-4xl w-full">
            {signerStatus.isConnected ? (
              <p className="text-lg text-muted-foreground mb-8">
                Your smart wallet is connected and ready to use on Base mainnet.
              </p>
            ) : (
              <p className="text-lg text-muted-foreground mb-8">
                Connect your wallet using the button in the top right to get started.
              </p>
            )}
            
            <div className="grid gap-4 md:grid-cols-3 w-full">
              <div className="p-6 border rounded-lg hover:shadow-lg transition-shadow">
                <h3 className="font-semibold mb-2">Smart Wallet</h3>
                <p className="text-sm text-muted-foreground">
                  ERC-4337 smart contracts with gasless transactions
                </p>
              </div>
              <div className="p-6 border rounded-lg hover:shadow-lg transition-shadow">
                <h3 className="font-semibold mb-2">Base Network</h3>
                <p className="text-sm text-muted-foreground">
                  Fast, low-cost transactions on Base mainnet
                </p>
              </div>
              <div className="p-6 border rounded-lg hover:shadow-lg transition-shadow">
                <h3 className="font-semibold mb-2">Easy Login</h3>
                <p className="text-sm text-muted-foreground">
                  Email, social accounts, or external wallets
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
