"use client";

import { useState, useRef, useEffect } from "react";
import { useLogout, useSignerStatus, useUser, useSmartAccountClient, useAuthModal } from "@account-kit/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { LiquidButton } from "@/components/ui/liquid-glass-button";
import { ChevronDown, LogOut, Wallet, Copy, Check, ArrowUpFromLine, ArrowDownToLine } from "lucide-react";
import Image from "next/image";
import { formatAddress } from "@/lib/utils";
import { toast } from "sonner";
import SendTokenModal from "./SendTokenModal";
import { fetchProcessedPortfolio, type PortfolioToken } from "@/services/portfolioService";
import { calculateTotalPortfolioValue, formatCurrency } from "@/services/tokenTransferService";

function HeaderContent() {
  const { logout } = useLogout();
  const { isConnected, isInitializing, error } = useSignerStatus();
  const user = useUser();
  const { openAuthModal } = useAuthModal();
  const [mounted, setMounted] = useState(false);
  const [showCopySuccess, setShowCopySuccess] = useState(false);
  const [showSendModal, setShowSendModal] = useState(false);
  const [portfolioTokens, setPortfolioTokens] = useState<PortfolioToken[]>([]);
  const [portfolioValue, setPortfolioValue] = useState(0);

  const { client } = useSmartAccountClient({});

  // Safely get the user address with proper guards - only when connected and initialized
  const userAddress = isConnected && !isInitializing && client?.account?.address ? client.account.address : null;
  const truncatedAddress = userAddress ? formatAddress(userAddress) : "";

  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch portfolio data when user connects
  useEffect(() => {
    async function loadPortfolioForBalance() {
      if (!isConnected || !client?.account?.address || isInitializing) {
        setPortfolioTokens([]);
        setPortfolioValue(0);
        return;
      }

      try {
        const tokens = await fetchProcessedPortfolio(client.account.address);
        setPortfolioTokens(tokens);
        setPortfolioValue(calculateTotalPortfolioValue(tokens));
      } catch (error) {
        console.error('Failed to load portfolio for balance:', error);
        setPortfolioTokens([]);
        setPortfolioValue(0);
      }
    }

    loadPortfolioForBalance();
  }, [isConnected, client?.account?.address, isInitializing]);

  const handleCopyAddress = async () => {
    if (userAddress) {
      try {
        await navigator.clipboard.writeText(userAddress);
        toast.success("Address copied to clipboard");
        
        // Show check icon for 2 seconds
        setShowCopySuccess(true);
        setTimeout(() => {
          setShowCopySuccess(false);
        }, 2000);
      } catch (err) {
        toast.error("Failed to copy address");
      }
    }
  };

  const shortenAddress = (address: string) => {
    if (!address) return "";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const handleSendToken = async (params: {
    tokenAddress: string;
    recipientAddress: string;
    amount: string;
    decimals: number;
  }): Promise<{ hash?: string; success: boolean }> => {
    try {
      // Dynamic import to avoid SSR issues
      const { sendERC20TokenWithApproval } = await import("@/services/tokenTransferService");
      
      if (!client) {
        throw new Error("Smart account client not available");
      }

      const result = await sendERC20TokenWithApproval(client, {
        tokenAddress: params.tokenAddress as `0x${string}`,
        recipientAddress: params.recipientAddress as `0x${string}`,
        amount: params.amount,
        decimals: params.decimals
      });

      if (result.success) {
        toast.success("Token sent successfully!");
        
        // Refresh portfolio after successful send
        if (userAddress) {
          const tokens = await fetchProcessedPortfolio(userAddress);
          setPortfolioTokens(tokens);
          setPortfolioValue(calculateTotalPortfolioValue(tokens));
        }

        return {
          hash: result.txHash,
          success: true
        };
      } else {
        throw new Error(result.error || "Transaction failed");
      }
    } catch (error) {
      console.error("Send token error:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to send token";
      toast.error(errorMessage);
      return {
        success: false
      };
    }
  };

  // Show loading state during hydration and initialization
  if (!mounted || isInitializing) {
    return (
      <header className="fixed left-0 top-0 z-20 w-full bg-transparent">
        <nav className="mx-auto flex items-center justify-between p-4 text-neutral-900 lg:container dark:text-white lg:px-8">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-purple-700">PortfoliOne</span>
          </div>
          <div className="flex gap-3">
            <div className="w-20 h-9 bg-muted animate-pulse rounded-xl"></div>
            <div className="w-24 h-9 bg-muted animate-pulse rounded-xl"></div>
          </div>
        </nav>
      </header>
    );
  }

  if (error) {
    return (
      <header className="fixed left-0 top-0 z-20 w-full bg-transparent">
        <nav className="mx-auto flex items-center justify-between p-4 text-neutral-900 lg:container dark:text-white lg:px-8">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-purple-700">PortfoliOne</span>
          </div>
          <div className="flex gap-3 text-sm font-medium">
            <Button
              onClick={() => openAuthModal()}
              className="min-h-9 bg-blue-50 text-blue-500 hover:bg-blue-100 dark:bg-blue-500/12 dark:text-blue-500 dark:hover:bg-blue-500/20 border-0 rounded-lg"
            >
              Sign in
            </Button>
          </div>
        </nav>
      </header>
    );
  }

  return (
    <header className="fixed left-0 top-0 z-20 w-full bg-transparent">
      <nav className="mx-auto flex items-center justify-between p-4 text-neutral-900 lg:container dark:text-white lg:px-8">
        {/* Left side - keep existing logo */}
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold text-purple-700">PortfoliOne</span>
        </div>

        {/* Right side - two components */}
        <div className="flex gap-3 text-sm font-medium">
          {isConnected ? (
            <>
              {/* Network Dropdown - Base only */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex h-9 items-center justify-center gap-1 rounded-lg bg-gray-50 p-2.5 duration-300 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 active:scale-95 dark:bg-white/10 dark:hover:bg-white/20">
                    <div className="flex items-center gap-2">
                      <Image
                        alt="Base"
                        src="/base-logo.svg"
                        width={20}
                        height={20}
                        className="size-5 rounded-full"
                      />
                      <p className="hidden sm:block text-neutral-900 dark:text-white">Base</p>
                    </div>
                    <ChevronDown className="size-4 text-gray-500 dark:text-white/50" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 p-2 rounded-lg">
                  <div className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 dark:text-white/80 rounded-lg">
                    <Image
                      alt="Base"
                      src="/base-logo.svg"
                      width={20}
                      height={20}
                      className="size-5 rounded-full"
                    />
                    <span>Base</span>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Wallet Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex h-9 items-center gap-2 rounded-lg bg-gray-50 p-2.5 duration-300 hover:bg-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 active:scale-95 dark:bg-white/10 dark:hover:bg-white/20">
                    <Wallet className="size-4 text-neutral-900 dark:text-white" />
                    <span className="text-sm font-medium text-neutral-900 dark:text-white">
                      {formatCurrency(portfolioValue)}
                    </span>
                    <ChevronDown className="size-4 text-gray-500 dark:text-white/50" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64 p-2 rounded-lg">
                  {/* Address with copy */}
                  <div className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5">
                    <div className="flex items-center gap-2">
                      <Wallet className="size-4 text-gray-500 dark:text-white/50" />
                      <span className="text-sm font-mono text-gray-700 dark:text-white/80">
                        {shortenAddress(userAddress || "")}
                      </span>
                    </div>
                    <button
                      onClick={handleCopyAddress}
                      className="p-1 rounded hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
                    >
                      {showCopySuccess ? (
                        <Check className="size-4 text-gray-500" />
                      ) : (
                        <Copy className="size-4 text-gray-500 dark:text-white/50" />
                      )}
                    </button>
                  </div>
                  
                  {/* Send / Receive */}
                  <DropdownMenuItem
                    onClick={() => setShowSendModal(true)}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:text-white/80 dark:hover:bg-white/5 cursor-pointer rounded-lg"
                  >
                    <div className="flex items-center gap-1">
                      <ArrowUpFromLine className="h-4 w-4" />
                    </div>
                    Send
                  </DropdownMenuItem>
                  
                  {/* Sign out */}
                  <DropdownMenuItem
                    onClick={() => logout()}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:text-white/80 dark:hover:bg-white/5 cursor-pointer rounded-lg"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <Button
              onClick={() => openAuthModal()}
              className="h-9 px-6 text-sm font-medium bg-gradient-to-r from-purple-100 to-purple-200 hover:from-purple-200 hover:to-purple-300 text-purple-700 border border-purple-200 hover:border-purple-300 rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 hover:scale-105"
            >
              Sign in
            </Button>
          )}
        </div>
      </nav>
      
      {/* Send Token Modal */}
      <SendTokenModal
        isOpen={showSendModal}
        onClose={() => setShowSendModal(false)}
        tokens={portfolioTokens}
        onSend={handleSendToken}
      />
    </header>
  );
}

export default HeaderContent;
