"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";

interface TokenData {
  name: string;
  symbol: string;
  usdValue: number;
}

interface PortfolioProps {
  tokens: TokenData[];
}

// Token logos mapping (using placeholder colors for now)
const tokenLogos: Record<string, { bg: string; icon: string }> = {
  ETH: { bg: "bg-gray-800", icon: "Ξ" },
  USDC: { bg: "bg-blue-600", icon: "$" },
  UNI: { bg: "bg-pink-500", icon: "🦄" },
  LDO: { bg: "bg-orange-500", icon: "◊" },
};

export default function Portfolio({ tokens }: PortfolioProps) {
  // Calculate total portfolio value
  const totalValue = tokens.reduce((sum, token) => sum + token.usdValue, 0);
  
  // Calculate current allocations
  const currentAllocations = tokens.map(token => ({
    ...token,
    allocation: totalValue > 0 ? (token.usdValue / totalValue) * 100 : 0
  }));

  // Initialize target allocations with a stable initial state
  const [targetAllocations, setTargetAllocations] = useState<Record<string, number>>(() => {
    const initialTargets: Record<string, number> = {};
    tokens.forEach(token => {
      const allocation = totalValue > 0 ? (token.usdValue / totalValue) * 100 : 0;
      initialTargets[token.symbol] = Math.round(allocation * 100) / 100;
    });
    return initialTargets;
  });

  // Update target allocations when tokens change
  useEffect(() => {
    const newTargets: Record<string, number> = {};
    currentAllocations.forEach(token => {
      newTargets[token.symbol] = Math.round(token.allocation * 100) / 100;
    });
    setTargetAllocations(newTargets);
  }, [tokens.length]); // Only update when tokens array changes

  // Calculate total target allocation
  const totalTargetAllocation = Object.values(targetAllocations).reduce((sum, val) => sum + (val || 0), 0);

  // Check if allocations match targets (within 0.1% tolerance)
  const allocationsMatch = currentAllocations.every(token => {
    const target = targetAllocations[token.symbol];
    if (target === undefined) return false; // If no target set, there are changes to make
    return Math.abs(token.allocation - target) < 0.1;
  });

  // Color logic: Green if total is 100%, red otherwise
  const totalIs100 = Math.abs(totalTargetAllocation - 100) < 0.1;
  const totalColor = totalIs100 ? "text-green-600" : "text-red-600";
  
  // Button logic: Disabled if allocations match targets OR if total is not 100%
  const isButtonDisabled = allocationsMatch || !totalIs100;

  const handleTargetChange = (symbol: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    setTargetAllocations(prev => ({
      ...prev,
      [symbol]: numValue
    }));
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  return (
    <section className="px-4 lg:px-8 py-4">
      <div className="max-w-6xl mx-auto">
        <div 
          className="rounded-2xl p-6 shadow-xl"
          style={{
            background: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
          }}
        >
          {/* Header */}
          <div className="mb-4">
            <div className="flex items-center mb-2">
              <div className="bg-purple-100 p-2 rounded-lg mr-4">
                <svg 
                  className="h-6 w-6 text-purple-600" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth="2"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-800">Portfolio Rebalancer</h2>
            </div>
            <p className="text-sm text-gray-600 ml-12">
              Track your current portfolio allocation and rebalance to your ideal target mix in one click.
            </p>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="py-2 px-4 font-semibold text-sm text-gray-500">Asset</th>
                  <th className="py-2 px-4 font-semibold text-sm text-gray-500 text-right">Value (USD)</th>
                  <th className="py-2 px-4 font-semibold text-sm text-gray-500 text-right">Allocation %</th>
                  <th className="py-2 px-4 font-semibold text-sm text-gray-500 text-right">Target Allocation %</th>
                </tr>
              </thead>
              <tbody>
                {currentAllocations.map((token, index) => (
                  <tr key={token.symbol} className={index < currentAllocations.length - 1 ? "border-b border-gray-200" : ""}>
                    <td className="py-3 px-4 flex items-center">
                      <div className={`w-8 h-8 mr-4 rounded-full flex items-center justify-center text-white font-bold text-sm ${tokenLogos[token.symbol]?.bg || 'bg-gray-500'}`}>
                        {tokenLogos[token.symbol]?.icon || token.symbol[0]}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{token.name}</p>
                        <p className="text-sm text-gray-500">{token.symbol}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-medium text-gray-900 text-right">
                      {formatCurrency(token.usdValue)}
                    </td>
                    <td className="py-3 px-4 font-medium text-gray-900 text-right">
                      {formatPercentage(token.allocation)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <input
                        type="number"
                        value={targetAllocations[token.symbol] || 0}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleTargetChange(token.symbol, e.target.value)}
                        className="w-16 px-2 py-1 text-right font-medium text-sm border border-gray-300 rounded focus:border-purple-500 focus:ring-1 focus:ring-purple-500 focus:outline-none"
                        step="0.1"
                        min="0"
                        max="100"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-purple-200">
                  <td className="py-3 px-4"></td>
                  <td className="py-3 px-4 font-bold text-gray-900 text-right">
                    {formatCurrency(totalValue)}
                  </td>
                  <td className="py-3 px-4 font-bold text-gray-900 text-right">100.00%</td>
                  <td className="py-3 px-4 font-bold text-right">
                    <span className={totalColor}>
                      {formatPercentage(totalTargetAllocation)}
                    </span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Rebalance Button */}
          <div className="mt-4 flex justify-center">
            <Button 
              disabled={isButtonDisabled}
              className="px-8 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
            >
              Rebalance Portfolio
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
