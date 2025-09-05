"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Image from "next/image";
import { useSmartAccountClient } from '@account-kit/react';
import RebalanceModal from './RebalanceModal';
import { type PortfolioTokenWithTarget } from '@/services/swapOptimizingService';
import { type UnifiedTransactionClient } from '@/services/unifiedTransactionService';

export interface PortfolioToken {
  name: string;
  address: string;
  symbol: string;
  decimals: number;
  value_usd: number;
  amount: number;
  logoURI: string | null;
}

// PortfolioTokenWithTarget is imported from swapOptimizingService

interface PortfolioProps {
  tokens: PortfolioToken[] | null;
  userAddress?: string;
  transactionClient?: UnifiedTransactionClient | null;
}



export default function Portfolio({ tokens, userAddress, transactionClient }: PortfolioProps) {
  // Loading state - only show loading if tokens is null/undefined, not if empty array
  const isLoading = !tokens;
  const isEmpty = tokens && tokens.length === 0;
  
  // Modal state
  const [isRebalanceModalOpen, setIsRebalanceModalOpen] = useState(false);
  
  // Get smart account client for user address fallback
  const { client } = useSmartAccountClient({});

  // Calculate total portfolio value (only if tokens exist)
  const totalValue = tokens ? tokens.reduce((sum, token) => sum + token.value_usd, 0) : 0;
  
  // Calculate current allocations (only if tokens exist)
  const currentAllocations = tokens ? tokens.map(token => ({
    ...token,
    allocation: totalValue > 0 ? (token.value_usd / totalValue) * 100 : 0
  })) : [];

  // Initialize target allocations with equal distribution (25% each for 4 tokens)
  const [targetAllocations, setTargetAllocations] = useState<Record<string, number>>(() => {
    const initialTargets: Record<string, number> = {};
    if (tokens && tokens.length > 0) {
      const equalAllocation = Math.floor(100 / tokens.length);
      const remainder = 100 - (equalAllocation * tokens.length);
      
      tokens.forEach((token, index) => {
        // Give the remainder to the first token to ensure total = 100%
        initialTargets[token.address] = equalAllocation + (index === 0 ? remainder : 0);
      });
    }
    return initialTargets;
  });

  // Update target allocations when tokens change - set to equal distribution
  useEffect(() => {
    if (tokens && tokens.length > 0) {
      const newTargets: Record<string, number> = {};
      const equalAllocation = Math.floor(100 / tokens.length);
      const remainder = 100 - (equalAllocation * tokens.length);
      
      tokens.forEach((token, index) => {
        // Give the remainder to the first token to ensure total = 100%
        newTargets[token.address] = equalAllocation + (index === 0 ? remainder : 0);
      });
      setTargetAllocations(newTargets);
    }
  }, [tokens?.length]); // Only update when tokens array changes

  // Calculate total target allocation
  const totalTargetAllocation = Object.values(targetAllocations).reduce((sum, val) => sum + (val || 0), 0);

  // Check if allocations match targets (within 1% tolerance - realistic for swap precision)
  const allocationsMatch = currentAllocations.every(token => {
    const target = targetAllocations[token.address];
    if (target === undefined) return false; // If no target set, there are changes to make
    return Math.abs(token.allocation - target) < 1;
  });

  // Color logic: Green if total is exactly 100%, red otherwise
  // Round to whole number for realistic swap precision
  const roundedTotal = Math.round(totalTargetAllocation);
  const totalIs100 = roundedTotal === 100;
  const totalColor = totalIs100 ? "text-green-600" : "text-red-600";
  
  // Button logic: Disabled if allocations match targets OR if total is not 100%
  const isButtonDisabled = allocationsMatch || !totalIs100;
  
  // Create tokens with targets for rebalancing
  const createTokensWithTargets = (): PortfolioTokenWithTarget[] => {
    console.log('Creating tokens with targets...');
    console.log('Current targetAllocations:', targetAllocations);
    
    return currentAllocations.map(token => {
      const targetPercentage = targetAllocations[token.address] || 0;
      const target_value_usd = (targetPercentage / 100) * totalValue;
      const currentPrice = token.value_usd / token.amount;
      const target_amount = target_value_usd / currentPrice;
      
      console.log(`Token ${token.symbol}:`, {
        currentValue: token.value_usd,
        targetPercentage,
        target_value_usd,
        difference: target_value_usd - token.value_usd
      });
      
      return {
        ...token,
        target_value_usd,
        target_amount
      };
    });
  };
  
  // Handle rebalance button click
  const handleRebalanceClick = () => {
    setIsRebalanceModalOpen(true);
  };
  
  // Get user address from props or client
  const effectiveUserAddress = userAddress || client?.account?.address || '';

  const handleTargetChange = (address: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    // Round to whole number - matches realistic swap precision
    const roundedValue = Math.round(numValue);
    
    setTargetAllocations(prev => ({
      ...prev,
      [address]: roundedValue
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
    // Show 1 decimal for current allocations, whole numbers for targets
    return `${value.toFixed(1)}%`;
  };

  // Empty state - show when portfolio has no tokens
  if (isEmpty) {
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

            {/* Empty State */}
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Your portfolio is empty</h3>
              <p className="text-gray-500 mb-4">Add some tokens to your wallet to start rebalancing your portfolio.</p>
              <p className="text-sm text-gray-400">Once you have tokens, they'll appear here and you can set target allocations.</p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // Skeleton loading state with exact same layout
  if (isLoading) {
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
            {/* Header Skeleton */}
            <div className="mb-4">
              <div className="flex items-center mb-2">
                <div className="bg-purple-100 p-2 rounded-lg mr-4">
                  <div className="h-6 w-6 bg-purple-200 rounded animate-pulse"></div>
                </div>
                <div className="h-6 w-48 bg-gray-200 rounded animate-pulse"></div>
              </div>
              <div className="ml-12">
                <div className="h-4 w-96 bg-gray-200 rounded animate-pulse"></div>
              </div>
            </div>

            {/* Table Skeleton */}
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
                  {/* Skeleton rows for 4 tokens */}
                  {[...Array(4)].map((_, index) => (
                    <tr key={index} className={index < 3 ? "border-b border-gray-200" : ""}>
                      <td className="py-3 px-4 flex items-center">
                        <div className="w-8 h-8 mr-4 rounded-full bg-gray-200 animate-pulse"></div>
                        <div>
                          <div className="h-4 w-20 bg-gray-200 rounded animate-pulse mb-1"></div>
                          <div className="h-3 w-12 bg-gray-200 rounded animate-pulse"></div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="h-4 w-20 bg-gray-200 rounded animate-pulse ml-auto"></div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="h-4 w-16 bg-gray-200 rounded animate-pulse ml-auto"></div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="w-16 h-8 bg-gray-200 rounded animate-pulse ml-auto"></div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 border-purple-200">
                    <td className="py-3 px-4"></td>
                    <td className="py-3 px-4 text-right">
                      <div className="h-4 w-20 bg-gray-200 rounded animate-pulse ml-auto"></div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="h-4 w-16 bg-gray-200 rounded animate-pulse ml-auto"></div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="h-4 w-16 bg-gray-200 rounded animate-pulse ml-auto"></div>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Button Skeleton */}
            <div className="mt-4 flex justify-center">
              <div className="h-12 w-40 bg-gray-200 rounded-lg animate-pulse"></div>
            </div>
          </div>
        </div>
      </section>
    );
  }

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
                  <tr key={token.address} className={index < currentAllocations.length - 1 ? "border-b border-gray-200" : ""}>
                    <td className="py-3 px-4 flex items-center">
                      <div className="w-8 h-8 mr-4 rounded-full flex items-center justify-center bg-gray-100 overflow-hidden">
                        {token.logoURI ? (
                          <Image
                            src={token.logoURI}
                            alt={`${token.symbol} logo`}
                            width={32}
                            height={32}
                            className="w-8 h-8 rounded-full object-cover"
                            onError={(e) => {
                              // Fallback to symbol initial if image fails to load
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              const parent = target.parentElement;
                              if (parent) {
                                parent.innerHTML = `<span class="text-gray-600 font-bold text-sm">${token.symbol[0]}</span>`;
                                parent.className = "w-8 h-8 mr-4 rounded-full flex items-center justify-center bg-gray-200";
                              }
                            }}
                          />
                        ) : (
                          <span className="text-gray-600 font-bold text-sm">{token.symbol[0]}</span>
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">{token.name}</p>
                        <p className="text-sm text-gray-500">{token.symbol}</p>
                      </div>
                    </td>
                    <td className="py-4 px-4 font-medium text-gray-900 text-right">
                      {formatCurrency(token.value_usd)}
                    </td>
                    <td className="py-3 px-4 font-medium text-gray-900 text-right">
                      {formatPercentage(token.allocation)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <input
                        type="number"
                        value={targetAllocations[token.address] || 0}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleTargetChange(token.address, e.target.value)}
                        className="w-16 px-2 py-1 text-right font-medium text-sm border border-gray-300 rounded focus:border-purple-500 focus:ring-1 focus:ring-purple-500 focus:outline-none"
                        step="1"
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
              onClick={handleRebalanceClick}
              disabled={isButtonDisabled}
              className="px-8 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
            >
              Rebalance Portfolio
            </Button>
          </div>
          
          {/* Rebalance Modal */}
          <RebalanceModal
            isOpen={isRebalanceModalOpen}
            onClose={() => setIsRebalanceModalOpen(false)}
            tokensWithTargets={createTokensWithTargets()}
            userAddress={effectiveUserAddress}
            transactionClient={transactionClient}
          />
        </div>
      </div>
    </section>
  );
}
