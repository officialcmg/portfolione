"use client";

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, CheckCircle, AlertCircle, Loader2, ExternalLink } from 'lucide-react';
import Image from 'next/image';
import { useWaitForCallsStatus } from 'wagmi';
import { generateOptimalSwaps, type PortfolioTokenWithTarget, type SwapInstruction } from '@/services/swapOptimizingService';
import { executePortfolioRebalancing, type RebalanceResult } from '@/services/classicSwapService';
import { type UnifiedTransactionClient } from '@/services/unifiedTransactionService';

interface RebalanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  tokensWithTargets: PortfolioTokenWithTarget[];
  userAddress: string;
  transactionClient?: UnifiedTransactionClient | null;
}

type RebalanceStep = 'preview' | 'optimizing' | 'generating' | 'executing' | 'complete' | 'error';

interface StepInfo {
  id: RebalanceStep;
  title: string;
  description: string;
  icon: string;
}

// Lightweight types for MiniKit calls status polling
type CallReceiptLite = { transactionHash?: `0x${string}` };
type CallsStatusLite = { receipts?: CallReceiptLite[] };

const REBALANCE_STEPS: StepInfo[] = [
  { id: 'optimizing', title: 'Optimizing swaps', description: 'Calculating optimal swap routes...', icon: '🔄' },
  { id: 'generating', title: 'Generating transactions', description: 'Creating swap transactions...', icon: '🔗' },
  { id: 'executing', title: 'Executing swaps', description: 'Processing your rebalance...', icon: '⛽' },
  { id: 'complete', title: 'Rebalancing complete', description: 'Your portfolio has been rebalanced!', icon: '✅' }
];

export default function RebalanceModal({ isOpen, onClose, tokensWithTargets, userAddress, transactionClient }: RebalanceModalProps) {
  const [currentStep, setCurrentStep] = useState<RebalanceStep>('preview');
  const [swapInstructions, setSwapInstructions] = useState<SwapInstruction[]>([]);
  const [rebalanceResult, setRebalanceResult] = useState<RebalanceResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Derive MiniKit calls ID (when there's no userOpHash, treat returned hash as callsId)
  const miniKitCallsId = (() => {
    if (!rebalanceResult) return undefined;
    const hash = rebalanceResult.txHash || '';
    const isAlchemy = !!rebalanceResult.userOpHash;
    if (isAlchemy) return undefined;
    if (hash && hash.startsWith('0x')) return hash as `0x${string}`;
    return undefined;
  })();

  // Poll for batched calls status (EIP-5792) to surface mined transaction receipts
  const { data: callsStatus, isLoading: isCallsLoading, isFetching: isCallsFetching } = useWaitForCallsStatus({
    id: miniKitCallsId as `0x${string}`,
    query: { enabled: !!miniKitCallsId, refetchInterval: 2000 },
  });

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentStep('preview');
      setSwapInstructions([]);
      setRebalanceResult(null);
      setError(null);
      setIsProcessing(false);
      
      // Generate swap preview immediately when modal opens
      generateSwapPreview();
    }
  }, [isOpen]);

  // Ensure UI finalizes and spinner stops whenever a result arrives
  useEffect(() => {
    if (!rebalanceResult) return;
    if (rebalanceResult.success) {
      setCurrentStep('complete');
    } else {
      setCurrentStep('error');
      if (rebalanceResult.error) setError(rebalanceResult.error);
    }
    setIsProcessing(false);
  }, [rebalanceResult]);

  // Generate swap instructions for preview
  const generateSwapPreview = async () => {
    try {
      console.log('Generating swap preview...');
      const swaps = generateOptimalSwaps(tokensWithTargets);
      setSwapInstructions(swaps);
      console.log('Swap preview generated:', swaps);
    } catch (error) {
      console.error('Error generating swap preview:', error);
      setError('Failed to generate swap preview');
      setCurrentStep('error');
    }
  };

  // Execute the complete rebalancing process
  const executeRebalancing = async () => {
    if (!transactionClient) {
      setError('Transaction client not available');
      setCurrentStep('error');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Step 1: Optimizing (already done in preview)
      setCurrentStep('optimizing');
      await new Promise(resolve => setTimeout(resolve, 1000)); // Brief pause for UX
      
      // Step 2: Generating transactions
      setCurrentStep('generating');
      await new Promise(resolve => setTimeout(resolve, 1500)); // Brief pause for UX
      
      // Step 3: Executing swaps
      setCurrentStep('executing');
      const result = await executePortfolioRebalancing(
        transactionClient,
        swapInstructions,
        userAddress
      );
      
      setRebalanceResult(result);

      if (result.success) {
        setCurrentStep('complete');
      } else {
        setError(result.error || 'Rebalancing failed');
        setCurrentStep('error');
      }
      
    } catch (error) {
      console.error('Error in rebalancing execution:', error);
      setError(error instanceof Error ? error.message : 'Unknown error occurred');
      setCurrentStep('error');
    } finally {
      setIsProcessing(false); // Ensure spinner stops in all cases
    }
  };

  // Get step status for UI rendering
  const getStepStatus = (stepId: RebalanceStep) => {
    const stepIndex = REBALANCE_STEPS.findIndex(step => step.id === stepId);
    const currentIndex = REBALANCE_STEPS.findIndex(step => step.id === currentStep);
    
    if (currentStep === 'error') {
      return stepIndex <= currentIndex ? 'error' : 'pending';
    }
    
    // Fix: When currentStep is 'complete', all steps should show as complete
    if (currentStep === 'complete') {
      return 'complete';
    }
    
    if (stepIndex < currentIndex) return 'complete';
    if (stepIndex === currentIndex) return 'current';
    return 'pending';
  };

  // Calculate total USD value of swaps
  const totalSwapValue = swapInstructions.reduce((sum, swap) => sum + swap.amountUsd, 0);

  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
              <span className="text-purple-600 font-bold">⚖️</span>
            </div>
            <h2 className="text-xl font-bold text-gray-900">Rebalance Portfolio</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            disabled={isProcessing}
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {currentStep === 'preview' && (
            <div className="space-y-6">
              {/* Swap Preview */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Swap Preview</h3>
                {swapInstructions.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No rebalancing needed - your portfolio is already optimized!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {swapInstructions.map((swap, index) => (
                      <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-100 overflow-hidden">
                              {(() => {
                                const fromTokenObj = tokensWithTargets.find(t => t.address === swap.fromToken);
                                return fromTokenObj?.logoURI ? (
                                  <Image
                                    src={fromTokenObj.logoURI}
                                    alt={`${swap.fromSymbol} logo`}
                                    width={32}
                                    height={32}
                                    className="w-8 h-8 rounded-full object-cover"
                                  />
                                ) : (
                                  <span className="text-gray-600 font-bold text-sm">{swap.fromSymbol[0]}</span>
                                );
                              })()} 
                            </div>
                            <span className="text-gray-400">→</span>
                            <div className="w-8 h-8 rounded-full flex items-center justify-center bg-gray-100 overflow-hidden">
                              {(() => {
                                const toTokenObj = tokensWithTargets.find(t => t.address === swap.toToken);
                                return toTokenObj?.logoURI ? (
                                  <Image
                                    src={toTokenObj.logoURI}
                                    alt={`${swap.toSymbol} logo`}
                                    width={32}
                                    height={32}
                                    className="w-8 h-8 rounded-full object-cover"
                                  />
                                ) : (
                                  <span className="text-gray-600 font-bold text-sm">{swap.toSymbol[0]}</span>
                                );
                              })()} 
                            </div>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">
                              {swap.fromSymbol} → {swap.toSymbol}
                            </p>
                            <p className="text-sm text-gray-500">
                              ${swap.amountUsd.toFixed(2)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    <div className="mt-4 p-4 bg-purple-50 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-gray-900">Total Swap Value:</span>
                        <span className="font-bold text-purple-600">${totalSwapValue.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Button */}
              {swapInstructions.length > 0 && (
                <button
                  onClick={executeRebalancing}
                  disabled={isProcessing}
                  className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 text-white font-medium py-3 px-4 rounded-lg transition-colors"
                >
                  {isProcessing ? 'Processing...' : 'Confirm Rebalance'}
                </button>
              )}
            </div>
          )}

          {/* Progress Steps - hide when complete */}
          {(currentStep !== 'preview' && currentStep !== 'error' && currentStep !== 'complete') && (
            <div className="space-y-6">
              <div className="space-y-4">
                {REBALANCE_STEPS.map((step, index) => {
                  const status = getStepStatus(step.id);
                  return (
                    <div key={step.id} className="flex items-center gap-4">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        status === 'complete' ? 'bg-green-100 text-green-600' :
                        status === 'current' ? 'bg-purple-100 text-purple-600' :
                        'bg-gray-100 text-gray-400'
                      }`}>
                        {status === 'complete' ? (
                          <CheckCircle className="w-5 h-5" />
                        ) : status === 'current' ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <span className="text-sm font-medium">{index + 1}</span>
                        )}
                      </div>
                      <div className="flex-1">
                        <p className={`font-medium ${
                          status === 'complete' ? 'text-green-600' :
                          status === 'current' ? 'text-purple-600' :
                          'text-gray-400'
                        }`}>
                          {step.icon} {step.title}
                        </p>
                        <p className="text-sm text-gray-500">{step.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Success State */}
          {currentStep === 'complete' && rebalanceResult && (
            <div className="space-y-6">
              <div className="text-center py-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                {/* Differentiate Alchemy (mined tx) vs MiniKit (submitted calls) */}
                {(() => {
                  const hash = rebalanceResult.txHash || '';
                  const isValidTxHash = /^0x[a-fA-F0-9]{64}$/.test(hash);
                  const isAlchemy = !!rebalanceResult.userOpHash;

                  // Alchemy path: we have a mined tx hash & userOpHash
                  if (isAlchemy && isValidTxHash) {
                    return (
                      <>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">✅ Portfolio Rebalanced Successfully!</h3>
                        <p className="text-gray-600 mb-4">🎯 Your transactions were mined on Base.</p>
                        <a
                          href={`https://basescan.org/tx/${hash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-purple-600 hover:text-purple-700 font-medium"
                        >
                          🔗 View on BaseScan
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </>
                    );
                  }

                  // MiniKit path (wallet_sendCalls): we start with a callsId
                  const receipts = (callsStatus as CallsStatusLite)?.receipts ?? [];

                  // If calls are confirmed, surface receipt tx hashes with BaseScan links
                  if (receipts.length > 0) {
                    return (
                      <>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">✅ Portfolio Rebalanced Successfully!</h3>
                        <p className="text-gray-600 mb-4">🎯 Your transactions were mined on Base.</p>
                        <div className="space-y-2">
                          {receipts.filter(r => !!r.transactionHash).map((r: CallReceiptLite, i: number) => (
                            <a
                              key={r.transactionHash as string}
                              href={`https://basescan.org/tx/${r.transactionHash as string}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 text-purple-600 hover:text-purple-700 font-medium"
                            >
                              🔗 Tx {i + 1} on BaseScan
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          ))}
                        </div>
                      </>
                    );
                  }

                  // Pending path: show calls ID and a fallback address link while we wait for receipts
                  return (
                    <>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">✅ Batched Calls Submitted</h3>
                      <p className="text-gray-600 mb-2">Your wallet has submitted the batched calls to process your rebalance.</p>
                      {miniKitCallsId && (
                        <p className="text-sm text-gray-500 break-all">Calls ID: <span className="font-mono">{miniKitCallsId}</span></p>
                      )}
                      <p className="text-sm text-gray-500 mt-3">
                        {(isCallsLoading || isCallsFetching) ? 'Waiting for confirmations…' : 'Waiting for receipts…'}
                      </p>
                      <a
                        href={`https://basescan.org/address/${userAddress}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-purple-600 hover:text-purple-700 font-medium mt-2"
                      >
                        🔎 View your wallet on BaseScan
                        <ExternalLink className="w-4 h-4" />
                      </a>
                      <p className="text-xs text-gray-400 mt-2">We’ll show transaction links automatically once confirmed.</p>
                    </>
                  );
                })()}
              </div>
              
              <button
                onClick={onClose}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          )}

          {/* Error State */}
          {currentStep === 'error' && (
            <div className="space-y-6">
              <div className="text-center py-6">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="w-8 h-8 text-red-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Rebalancing Failed</h3>
                <p className="text-red-600 mb-4">{error}</p>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setCurrentStep('preview');
                    setError(null);
                  }}
                  className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-3 px-4 rounded-lg transition-colors"
                >
                  Try Again
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
