import { encodeFunctionData, parseUnits, Address } from "viem";
import { type PortfolioToken } from "@/services/portfolioService";

// ERC-20 ABI for approve and transfer functions
const ERC20_ABI = [
  {
    name: "approve",
    type: "function",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" }
    ],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable"
  },
  {
    name: "transfer",
    type: "function",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" }
    ],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable"
  },
  {
    name: "balanceOf",
    type: "function",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view"
  }
] as const;

export interface SendTokenParams {
  tokenAddress: Address;
  recipientAddress: Address;
  amount: string;
  decimals: number;
}

export interface SendTokenResult {
  success: boolean;
  txHash?: string;
  userOpHash?: string;
  error?: string;
}

/**
 * Production-grade ERC-20 token transfer with approval batching
 * Batches approve and transfer operations into a single UserOperation for:
 * - Atomic execution (both succeed or both fail)
 * - Gas efficiency (single transaction)
 * - Better UX (single confirmation)
 */
export async function sendERC20TokenWithApproval(
  client: any, // SmartAccountClient from Account Kit
  params: SendTokenParams
): Promise<SendTokenResult> {
  const { tokenAddress, recipientAddress, amount, decimals } = params;

  try {
    // Input validation
    if (!client?.account?.address) {
      throw new Error("Smart account client not available");
    }

    if (!tokenAddress || !recipientAddress || !amount) {
      throw new Error("Missing required parameters");
    }

    const amountFloat = parseFloat(amount);
    if (isNaN(amountFloat) || amountFloat <= 0) {
      throw new Error("Invalid amount");
    }

    // Convert amount to proper units (e.g., 1.5 USDC -> 1500000 for 6 decimals)
    const amountInWei = parseUnits(amount, decimals);
    const senderAddress = client.account.address as Address;

    console.log(`Preparing to send ${amount} tokens from ${senderAddress} to ${recipientAddress}`);

    // For direct transfers from smart wallet, we don't need approval
    // Smart wallets can directly transfer their own tokens
    const transferData = encodeFunctionData({
      abi: ERC20_ABI,
      functionName: "transfer",
      args: [recipientAddress, amountInWei]
    });

    console.log("Encoded transfer data:", transferData);

    // Send the user operation with the transfer
    const userOpResult = await client.sendUserOperation({
      uo: {
        target: tokenAddress,
        data: transferData,
        value: BigInt(0) // No ETH value for ERC-20 transfers
      }
    });

    // Extract the hash from the result object
    const userOpHash = typeof userOpResult === 'string' ? userOpResult : userOpResult.hash;
    console.log("User operation submitted:", userOpHash);

    // Wait for the transaction to be mined
    const txHash = await client.waitForUserOperationTransaction({
      hash: userOpHash
    });

    console.log("Transaction confirmed:", txHash);

    return {
      success: true,
      txHash,
      userOpHash
    };

  } catch (error) {
    console.error("Error in sendERC20TokenWithApproval:", error);
    
    let errorMessage = "Unknown error occurred";
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === "string") {
      errorMessage = error;
    }

    return {
      success: false,
      error: errorMessage
    };
  }
}

/**
 * Advanced batched approve + transfer for complex scenarios
 * Use this when you need to approve a spender before transfer
 * (e.g., for DEX interactions, not needed for direct transfers)
 */
export async function sendERC20TokenWithBatchedApproval(
  client: any,
  params: SendTokenParams & { spenderAddress: Address }
): Promise<SendTokenResult> {
  const { tokenAddress, recipientAddress, spenderAddress, amount, decimals } = params;

  try {
    if (!client?.account?.address) {
      throw new Error("Smart account client not available");
    }

    const amountInWei = parseUnits(amount, decimals);

    // Encode approve function call
    const approveData = encodeFunctionData({
      abi: ERC20_ABI,
      functionName: "approve",
      args: [spenderAddress, amountInWei]
    });

    // Encode transfer function call
    const transferData = encodeFunctionData({
      abi: ERC20_ABI,
      functionName: "transfer",
      args: [recipientAddress, amountInWei]
    });

    console.log("Batching approve + transfer operations");

    // Batch both operations in a single UserOperation
    const userOpHash = await client.sendUserOperation({
      uo: [
        {
          target: tokenAddress,
          data: approveData,
          value: BigInt(0)
        },
        {
          target: tokenAddress,
          data: transferData,
          value: BigInt(0)
        }
      ]
    });

    console.log("Batched user operation submitted:", userOpHash);

    const txHash = await client.waitForUserOperationTransaction({
      hash: userOpHash
    });

    console.log("Batched transaction confirmed:", txHash);

    return {
      success: true,
      txHash,
      userOpHash
    };

  } catch (error) {
    console.error("Error in batched approve + transfer:", error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : "Batched operation failed"
    };
  }
}

/**
 * Calculate total portfolio value in USD
 */
export function calculateTotalPortfolioValue(tokens: PortfolioToken[]): number {
  return tokens.reduce((total, token) => total + token.value_usd, 0);
}

/**
 * Filter tokens with non-zero balances for sending
 */
export function getTokensWithBalance(tokens: PortfolioToken[]): PortfolioToken[] {
  return tokens.filter(token => token.amount > 0);
}

/**
 * Format currency for display
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Validate if amount is within available balance
 */
export function validateSendAmount(amount: string, availableBalance: number): {
  isValid: boolean;
  error?: string;
} {
  const amountFloat = parseFloat(amount);
  
  if (isNaN(amountFloat)) {
    return { isValid: false, error: "Invalid amount format" };
  }
  
  if (amountFloat <= 0) {
    return { isValid: false, error: "Amount must be greater than 0" };
  }
  
  if (amountFloat > availableBalance) {
    return { isValid: false, error: "Amount exceeds available balance" };
  }
  
  return { isValid: true };
}
