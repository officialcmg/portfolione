"use client";

import { useEffect, useState } from "react";
import Header from "./components/header";
import Portfolio from "./components/Portfolio";
import { useAuthModal, useSignerStatus, useSmartAccountClient } from "@account-kit/react";
import { useMiniKit, useAuthenticate } from "@coinbase/onchainkit/minikit";
import { useAccount, useSendCalls } from "wagmi";
import { Button } from "@/components/ui/button";
import { fetchProcessedPortfolio, type PortfolioToken } from "@/services/portfolioService";
import { createUnifiedTransactionClient } from "@/services/unifiedTransactionService";

export default function Home() {
  const [isVisible, setIsVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [portfolioTokens, setPortfolioTokens] = useState<PortfolioToken[] | null>(null);
  const [isLoadingPortfolio, setIsLoadingPortfolio] = useState(false);
  const [portfolioError, setPortfolioError] = useState<string | null>(null);
  
  const { openAuthModal } = useAuthModal();
  const { isConnected, isInitializing } = useSignerStatus();
  const { client } = useSmartAccountClient({});
  const { setFrameReady, isFrameReady, context } = useMiniKit();
  const { signIn } = useAuthenticate();
  
  // Wagmi hooks for MiniKit transaction support
  const { address: wagmiAddress, isConnected: wagmiConnected } = useAccount();
  const { sendCalls } = useSendCalls();

  useEffect(() => {
    // Trigger animation on mount
    setIsVisible(true);
    setMounted(true);

    // Suppress Account Kit "Signer not connected" errors during initialization
    const originalError = console.error;
    console.error = (...args) => {
      const message = args.join(' ');
      if (message.includes('Signer not connected') || 
          message.includes('createAccount.js:57') ||
          message.includes('getSmartAccountClient.js:82')) {
        return; // Suppress these specific errors
      }
      originalError.apply(console, args);
    };

    // Cleanup function to restore original console.error
    return () => {
      console.error = originalError;
    };
  }, []);

  // Extract stable address reference to prevent infinite re-renders
  const [currentAddress, setCurrentAddress] = useState<string | null>(null);
  
  // Determine if we're in a miniapp context
  const isMiniApp = context?.user?.fid !== undefined;
  
  // Get address from either Account Kit or Wagmi (for MiniKit)
  const getEffectiveAddress = () => {
    // Priority: Account Kit client address (for direct wallet connections)
    if (client?.account?.address) {
      return client.account.address;
    }
    // Fallback: Wagmi address (for MiniKit/Farcaster context)
    if (wagmiAddress) {
      return wagmiAddress;
    }
    return null;
  };
  
  // Update address when either client changes, but only when it's actually different
  useEffect(() => {
    const newAddress = getEffectiveAddress();
    if (newAddress !== currentAddress) {
      setCurrentAddress(newAddress);
    }
  }, [client?.account?.address, wagmiAddress, currentAddress]);
  
  // Unified connection state - connected if either Account Kit or Wagmi is connected
  const isUserConnected = isConnected || wagmiConnected;
  
  // Create unified transaction client
  const transactionClient = createUnifiedTransactionClient(
    client, // Alchemy client
    wagmiAddress, // MiniKit address
    wagmiConnected && sendCalls ? async (params) => {
      sendCalls(params);
      return 'pending'; // Return a placeholder since sendCalls doesn't return the hash immediately
    } : undefined // MiniKit sendCalls function wrapper
  );

  // Fetch portfolio data when user connects
  useEffect(() => {
    async function loadPortfolio() {
      if (!isUserConnected || !currentAddress || isInitializing) {
        return;
      }

      setIsLoadingPortfolio(true);
      setPortfolioError(null);
      
      try {
        console.log('Fetching portfolio for:', currentAddress);
        const tokens = await fetchProcessedPortfolio(currentAddress);
        setPortfolioTokens(tokens);
      } catch (error) {
        console.error('Failed to load portfolio:', error);
        setPortfolioError('Failed to load portfolio data');
        // Fallback to sample data on error
        setPortfolioTokens(sampleTokens);
      } finally {
        setIsLoadingPortfolio(false);
      }
    }

    loadPortfolio();
  }, [isUserConnected, currentAddress, isInitializing]);

  // Auto-authenticate MiniKit users if possible
  useEffect(() => {
    if (isMiniApp && context?.user?.fid && !isUserConnected && !isInitializing) {
      console.log('🔐 Attempting MiniKit auto-authentication for FID:', context.user.fid);
      // Add timeout to prevent infinite waiting
      const timeout = setTimeout(() => {
        console.log('⚠️ Auto-signin timeout, proceeding without authentication');
      }, 3000);
      
      signIn().finally(() => clearTimeout(timeout));
    }
  }, [isMiniApp, context?.user?.fid, isUserConnected, isInitializing, signIn]);

  // Add timeout fallback for setFrameReady
  useEffect(() => {
    if (isMiniApp && mounted && !isFrameReady) {
      // Aggressive timeout - set frame ready after 2 seconds regardless of state
      const fallbackTimeout = setTimeout(() => {
        console.log('🚨 Fallback timeout: Setting frame ready to prevent infinite splash');
        setFrameReady();
      }, 4000);

      return () => clearTimeout(fallbackTimeout);
    }
  }, [isMiniApp, mounted, isFrameReady, setFrameReady]);

  // Call setFrameReady when app is fully loaded and ready for interaction
  useEffect(() => {
    console.log('🔍 Frame ready check:', {
      mounted,
      isInitializing,
      isUserConnected,
      isLoadingPortfolio,
      isFrameReady,
      isMiniApp
    });
    
    // For miniapps, we need to be more aggressive about calling setFrameReady
    // Don't wait for user connection if it's taking too long
    if (mounted && !isInitializing && !isFrameReady) {
      // If user is connected, wait for portfolio to load
      if (isUserConnected && isLoadingPortfolio) {
        console.log('⏳ Waiting for portfolio to load...');
        return;
      }
      
      // Otherwise, set frame ready
      console.log('✅ Setting frame ready');
      setFrameReady();
    }
  }, [mounted, isInitializing, isUserConnected, isLoadingPortfolio, isFrameReady, setFrameReady, isMiniApp]);

  return (
    <>
      <Header />
      {/* Main content area with top padding to account for fixed navbar */}
      <main className="pt-20">
        {/* Hero Section */}
        <section className="px-4 lg:px-8 py-8 text-center">
          <div className="max-w-6xl mx-auto">
            <div 
              className={`transition-opacity duration-500 ease-out ${
                isVisible 
                  ? 'opacity-100' 
                  : 'opacity-0'
              }`}
            >
              <h1 
                className="text-5xl sm:text-6xl font-normal leading-tight" 
                style={{ color: 'hsl(240 5% 65%)' }}
              >
                Rebalance your crypto
              </h1>
              <h2 
                className="text-5xl sm:text-6xl font-medium leading-tight italic"
                style={{ 
                  color: 'hsl(222.2 84% 4.9%)',
                  fontFamily: 'Georgia, "Times New Roman", serif'
                }}
              >
                in one click
              </h2>
            </div>
          </div>
        </section>
        
        {/* Conditional Content Based on Authentication */}
        {!mounted || isInitializing ? (
          // Loading state - shown during SSR and initialization
          <section className="px-4 lg:px-8 py-16">
            <div className="max-w-2xl mx-auto text-center">
              <div className="animate-pulse">
                <div className="h-6 bg-gray-200 rounded w-48 mx-auto mb-4"></div>
                <div className="h-10 bg-gray-200 rounded w-32 mx-auto"></div>
              </div>
            </div>
          </section>
        ) : isUserConnected ? (
          // Authenticated: Show Portfolio
          isLoadingPortfolio ? (
            <section className="px-4 lg:px-8 py-16">
              <div className="max-w-2xl mx-auto text-center">
                <div className="animate-pulse">
                  <div className="h-6 bg-gray-200 rounded w-64 mx-auto mb-4"></div>
                  <div className="h-4 bg-gray-200 rounded w-48 mx-auto"></div>
                </div>
                <p className="text-gray-600 mt-4">Loading your portfolio...</p>
              </div>
            </section>
          ) : portfolioError ? (
            <section className="px-4 lg:px-8 py-16">
              <div className="max-w-2xl mx-auto text-center">
                <p className="text-red-600 mb-4">{portfolioError}</p>
                <p className="text-gray-600">Showing sample data instead.</p>
              </div>
              <Portfolio 
                tokens={portfolioTokens} 
                userAddress={currentAddress || undefined}
                transactionClient={transactionClient}
              />
            </section>
          ) : (
            <Portfolio 
              tokens={portfolioTokens} 
              userAddress={currentAddress || undefined}
              transactionClient={transactionClient}
            />
          )
        ) : (
          // Unauthenticated: Show Sign In Message
          <section className="px-4 lg:px-8 py-16">
            <div className="max-w-2xl mx-auto text-center">
              <div 
                className={`transition-opacity duration-500 ease-out ${
                  isVisible 
                    ? 'opacity-100' 
                    : 'opacity-0'
                }`}
              >
                <p className="text-lg text-gray-600 mb-8">
                  {isMiniApp 
                    ? "Connect your wallet to view your portfolio." 
                    : "Please sign in to view your portfolio."
                  }
                </p>
                <Button
                  onClick={() => openAuthModal()}
                  className="h-12 px-8 text-base font-medium bg-gradient-to-r from-purple-100 to-purple-200 hover:from-purple-200 hover:to-purple-300 text-purple-700 border border-purple-200 hover:border-purple-300 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 hover:scale-105"
                >
                  {isMiniApp ? "Connect Wallet" : "Sign In"}
                </Button>
              </div>
            </div>
          </section>
        )}
      </main>
    </>
  );
}

// Sample token data (fallback)
const sampleTokens: PortfolioToken[] = [
  {
    name: "Ethereum",
    symbol: "ETH",
    address: "0x0000000000000000000000000000000000000000",
    decimals: 18,
    value_usd: 3789.22,
    amount: 1.5,
    logoURI: null
  },
  {
    name: "USD Coin",
    symbol: "USDC",
    address: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    decimals: 6,
    value_usd: 2526.15,
    amount: 2526.15,
    logoURI: null
  },
  {
    name: "Uniswap",
    symbol: "UNI",
    address: "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",
    decimals: 18,
    value_usd: 1263.07,
    amount: 150.5,
    logoURI: null
  },
  {
    name: "Lido DAO Token",
    symbol: "LDO",
    address: "0x5A98FcBEA516Cf06857215779Fd812CA3beF1B32",
    decimals: 18,
    value_usd: 842.05,
    amount: 500.25,
    logoURI: null
  }
];
