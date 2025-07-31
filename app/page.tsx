"use client";

import { useEffect, useState } from "react";
import Header from "./components/header";
import Portfolio from "./components/Portfolio";
import { useAuthModal, useSignerStatus, useSmartAccountClient } from "@account-kit/react";
import { Button } from "@/components/ui/button";
import { fetchProcessedPortfolio, type PortfolioToken } from "@/services/portfolioservice";

export default function Home() {
  const [isVisible, setIsVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [portfolioTokens, setPortfolioTokens] = useState<PortfolioToken[]>([]);
  const [isLoadingPortfolio, setIsLoadingPortfolio] = useState(false);
  const [portfolioError, setPortfolioError] = useState<string | null>(null);
  
  const { openAuthModal } = useAuthModal();
  const { isConnected, isInitializing } = useSignerStatus();
  const { client } = useSmartAccountClient({});

  useEffect(() => {
    // Trigger animation on mount
    setIsVisible(true);
    setMounted(true);
  }, []);

  // Fetch portfolio data when user connects
  useEffect(() => {
    async function loadPortfolio() {
      if (!isConnected || !client?.account?.address || isInitializing) {
        return;
      }

      setIsLoadingPortfolio(true);
      setPortfolioError(null);
      
      try {
        console.log('Fetching portfolio for:', client.account.address);
        const tokens = await fetchProcessedPortfolio(client.account.address);
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
  }, [isConnected, client?.account?.address, isInitializing]);

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
        ) : isConnected ? (
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
              <Portfolio tokens={portfolioTokens} />
            </section>
          ) : (
            <Portfolio tokens={portfolioTokens} />
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
                  Please sign in to view your portfolio.
                </p>
                <Button
                  onClick={() => openAuthModal()}
                  className="h-12 px-8 text-base font-medium bg-gradient-to-r from-purple-100 to-purple-200 hover:from-purple-200 hover:to-purple-300 text-purple-700 border border-purple-200 hover:border-purple-300 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 hover:scale-105"
                >
                  Sign In
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
