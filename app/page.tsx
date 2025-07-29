"use client";

import { useEffect, useState } from "react";
import Header from "./components/header";
import Portfolio from "./components/Portfolio";

export default function Home() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger animation on mount
    setIsVisible(true);
  }, []);

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
        
        {/* Portfolio Component */}
        <Portfolio tokens={sampleTokens} />
      </main>
    </>
  );
}

// Sample token data
const sampleTokens = [
  {
    name: "Ethereum",
    symbol: "ETH",
    usdValue: 3789.22
  },
  {
    name: "USD Coin",
    symbol: "USDC",
    usdValue: 2526.15
  },
  {
    name: "Uniswap",
    symbol: "UNI",
    usdValue: 1263.07
  },
  {
    name: "Lido DAO Token",
    symbol: "LDO",
    usdValue: 842.05
  }
];
