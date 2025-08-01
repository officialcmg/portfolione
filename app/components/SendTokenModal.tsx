"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Image from "next/image";
import { X, ArrowUpFromLine, ArrowDownToLine, CheckCircle, AlertCircle, ExternalLink, RotateCcw } from "lucide-react";
import { type PortfolioToken } from "@/services/portfolioService";
import { getTokensWithBalance, validateSendAmount, formatCurrency } from "@/services/tokenTransferService";

interface SendTokenModalProps {
  isOpen: boolean;
  onClose: () => void;
  tokens: PortfolioToken[];
  onSend: (params: { tokenAddress: string; recipientAddress: string; amount: string; decimals: number }) => Promise<{ hash?: string; success: boolean }>;
}

type TransactionStatus = 'idle' | 'preparing' | 'confirming' | 'success' | 'error';

export default function SendTokenModal({ isOpen, onClose, tokens, onSend }: SendTokenModalProps) {
  const [selectedToken, setSelectedToken] = useState<PortfolioToken | null>(null);
  const [recipientAddress, setRecipientAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState<TransactionStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [transactionHash, setTransactionHash] = useState<string | null>(null);

  // Filter tokens with non-zero balance
  const availableTokens = getTokensWithBalance(tokens);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (!isOpen) {
      setSelectedToken(null);
      setRecipientAddress("");
      setAmount("");
      setError(null);
      setStatus('idle');
      setTransactionHash(null);
    }
  }, [isOpen]);

  // Validate form
  const validateForm = () => {
    if (!selectedToken) {
      setError("Please select a token");
      return false;
    }

    if (!recipientAddress.trim()) {
      setError("Please enter recipient address");
      return false;
    }

    // Basic address validation (starts with 0x and 42 characters)
    if (!recipientAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      setError("Invalid recipient address format");
      return false;
    }

    const amountValidation = validateSendAmount(amount, selectedToken.amount);
    if (!amountValidation.isValid) {
      setError(amountValidation.error || "Invalid amount");
      return false;
    }

    setError(null);
    return true;
  };

  const handleSend = async () => {
    if (!validateForm() || !selectedToken) return;

    setStatus('preparing');
    setError(null);
    setTransactionHash(null);

    try {
      setStatus('confirming');
      const result = await onSend({
        tokenAddress: selectedToken.address,
        recipientAddress: recipientAddress.trim(),
        amount: amount.trim(),
        decimals: selectedToken.decimals
      });

      if (result.success) {
        setStatus('success');
        setTransactionHash(result.hash || null);
        // Auto-close after 3 seconds on success
        setTimeout(() => {
          if (status === 'success') {
            onClose();
          }
        }, 3000);
      } else {
        setStatus('error');
        setError("Transaction failed. Please try again.");
      }
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : "Failed to send token");
    }
  };

  const handleRetry = () => {
    setStatus('idle');
    setError(null);
    setTransactionHash(null);
  };

  const isFormValid = selectedToken && recipientAddress.trim() && amount.trim() && !error;
  const isProcessing = status === 'preparing' || status === 'confirming';
  const isCompleted = status === 'success' || status === 'error';

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <ArrowUpFromLine className="size-5 text-purple-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Send</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            disabled={isProcessing}
          >
            <X className="size-5 text-gray-500" />
          </button>
        </div>

        {/* Token Selector */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Token
          </label>
          <div className="relative">
            <select
              value={selectedToken?.address || ""}
              onChange={(e) => {
                const token = availableTokens.find(t => t.address === e.target.value);
                setSelectedToken(token || null);
                setAmount(""); // Reset amount when token changes
                setError(null);
              }}
              className="w-full p-3 border border-gray-300 rounded-lg focus:border-purple-500 focus:ring-1 focus:ring-purple-500 focus:outline-none appearance-none bg-white"
              disabled={isProcessing}
            >
              <option value="">Choose a token...</option>
              {availableTokens.map((token) => (
                <option key={token.address} value={token.address}>
                  {token.symbol} - {token.amount.toFixed(6)} ({formatCurrency(token.value_usd)})
                </option>
              ))}
            </select>
          </div>
          
          {/* Selected Token Display */}
          {selectedToken && (
            <div className="mt-2 p-3 bg-gray-50 rounded-lg flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center">
                {selectedToken.logoURI ? (
                  <Image
                    src={selectedToken.logoURI}
                    alt={`${selectedToken.symbol} logo`}
                    width={32}
                    height={32}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <span className="text-gray-600 font-bold text-sm">{selectedToken.symbol[0]}</span>
                )}
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900">{selectedToken.name}</p>
                <p className="text-sm text-gray-500">
                  Balance: {selectedToken.amount.toFixed(6)} {selectedToken.symbol}
                </p>
              </div>
              <div className="text-right">
                <p className="font-medium text-gray-900">{formatCurrency(selectedToken.value_usd)}</p>
              </div>
            </div>
          )}
        </div>

        {/* Recipient Address */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Recipient Address
          </label>
          <Input
            type="text"
            placeholder="0x..."
            value={recipientAddress}
            onChange={(e) => {
              setRecipientAddress(e.target.value);
              setError(null);
            }}
            className="w-full"
            disabled={isProcessing}
          />
        </div>

        {/* Amount */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Amount
          </label>
          <div className="relative">
            <Input
              type="number"
              placeholder="0.0"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                setError(null);
              }}
              className="w-full pr-16"
              disabled={isProcessing || !selectedToken}
              step="any"
              min="0"
            />
            {selectedToken && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <span className="text-sm font-medium text-gray-500">{selectedToken.symbol}</span>
              </div>
            )}
          </div>
          {selectedToken && (
            <div className="mt-1 flex justify-between text-sm text-gray-500">
              <span>Available: {selectedToken.amount.toFixed(6)} {selectedToken.symbol}</span>
              <button
                onClick={() => setAmount(selectedToken.amount.toString())}
                className="text-purple-600 hover:text-purple-700 font-medium"
                disabled={isProcessing}
              >
                Max
              </button>
            </div>
          )}
        </div>

        {/* Status Display */}
        {status === 'success' && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-3">
              <CheckCircle className="size-5 text-green-600 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-green-800">Transaction Successful!</p>
                <p className="text-xs text-green-600 mt-1">
                  Your tokens have been sent successfully. This modal will close automatically.
                </p>
                {transactionHash && (
                  <a
                    href={`https://basescan.org/tx/${transactionHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-green-700 hover:text-green-800 mt-2 font-medium"
                  >
                    View on BaseScan <ExternalLink className="size-3" />
                  </a>
                )}
              </div>
            </div>
          </div>
        )}

        {status === 'error' && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-3">
              <AlertCircle className="size-5 text-red-600 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-800">Transaction Failed</p>
                <p className="text-xs text-red-600 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {(status === 'preparing' || status === 'confirming') && (
          <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin flex-shrink-0"></div>
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-800">
                  {status === 'preparing' ? 'Preparing Transaction...' : 'Confirming Transaction...'}
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  {status === 'preparing' 
                    ? 'Setting up your transaction with optimal gas settings.'
                    : 'Please wait while your transaction is being confirmed on the blockchain.'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          {status === 'error' && (
            <Button
              onClick={handleRetry}
              variant="outline"
              className="flex-1 h-12 border-purple-200 text-purple-600 hover:bg-purple-50"
            >
              <RotateCcw className="size-4 mr-2" />
              Retry
            </Button>
          )}
          
          {status === 'success' ? (
            <Button
              onClick={onClose}
              className="w-full h-12 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg"
            >
              <CheckCircle className="size-4 mr-2" />
              Done
            </Button>
          ) : (
            <Button
              onClick={handleSend}
              disabled={!isFormValid || isProcessing || isCompleted}
              className={`${status === 'error' ? 'flex-1' : 'w-full'} h-12 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors`}
            >
              {status === 'preparing' ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Preparing...
                </div>
              ) : status === 'confirming' ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Confirming...
                </div>
              ) : (
                "Send Token"
              )}
            </Button>
          )}
        </div>

        {/* Available Tokens Info */}
        {availableTokens.length === 0 && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-700">
              No tokens with balance available to send.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
