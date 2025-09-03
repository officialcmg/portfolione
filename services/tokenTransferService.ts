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
  isETH?: boolean;
}

export interface SendTokenResult {
  success: boolean;
  txHash?: string;
  userOpHash?: string;
  error?: string;
}

/**
 * Check if token is ETH based on address
 */
function isETHToken(tokenAddress: string): boolean {
  const ethAddresses = [
    '0x0000000000000000000000000000000000000000',
    '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
    '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'
  ];
  return ethAddresses.includes(tokenAddress.toLowerCase());
}

/**
 * Universal token transfer function that handles both ETH and ERC-20 tokens
 * Works with unified transaction client (Account Kit or MiniKit)
 * Automatically detects ETH vs ERC-20 based on token address
 */
export async function sendTokenUniversal(
  client: any, // UnifiedTransactionClient or legacy SmartAccountClient
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

    const senderAddress = client.account.address as Address;
    const isETH = isETHToken(tokenAddress);

    console.log(`Preparing to send ${amount} ${isETH ? 'ETH' : 'tokens'} from ${senderAddress} to ${recipientAddress}`);

    // Check if client is unified transaction client or legacy Account Kit client
    const isUnifiedClient = client.sendBatchedTransactions && typeof client.sendBatchedTransactions === 'function';
    
    if (isUnifiedClient) {
      // Use unified transaction client
      const transaction = isETH ? {
        to: recipientAddress,
        data: '0x',
        value: parseUnits(amount, 18).toString(), // ETH always has 18 decimals
        type: 'ETH_TRANSFER',
        description: `Send ${amount} ETH to ${recipientAddress}`
      } : {
        to: tokenAddress,
        data: encodeFunctionData({
          abi: ERC20_ABI,
          functionName: "transfer",
          args: [recipientAddress, parseUnits(amount, decimals)]
        }),
        value: '0',
        type: 'ERC20_TRANSFER', 
        description: `Send ${amount} tokens to ${recipientAddress}`
      };

      const result = await client.sendBatchedTransactions([transaction]);
      
      if (result.success) {
        return {
          success: true,
          txHash: result.txHash,
          userOpHash: result.userOpHash
        };
      } else {
        throw new Error(result.error || 'Transaction failed');
      }
    } else {
      // Legacy Account Kit client
      if (isETH) {
        // Native ETH transfer
        const amountInWei = parseUnits(amount, 18);
        
        const userOpResult = await client.sendUserOperation({
          uo: {
            target: recipientAddress,
            data: '0x',
            value: amountInWei
          }
        });

        const userOpHash = typeof userOpResult === 'string' ? userOpResult : userOpResult.hash;
        console.log("ETH transfer user operation submitted:", userOpHash);

        const txHash = await client.waitForUserOperationTransaction({
          hash: userOpHash
        });

        return {
          success: true,
          txHash,
          userOpHash
        };
      } else {
        // ERC-20 token transfer
        const amountInWei = parseUnits(amount, decimals);
        
        const transferData = encodeFunctionData({
          abi: ERC20_ABI,
          functionName: "transfer",
          args: [recipientAddress, amountInWei]
        });

        const userOpResult = await client.sendUserOperation({
          uo: {
            target: tokenAddress,
            data: transferData,
            value: BigInt(0)
          }
        });

        const userOpHash = typeof userOpResult === 'string' ? userOpResult : userOpResult.hash;
        console.log("ERC-20 transfer user operation submitted:", userOpHash);

        const txHash = await client.waitForUserOperationTransaction({
          hash: userOpHash
        });

        return {
          success: true,
          txHash,
          userOpHash
        };
      }
    }

  } catch (error) {
    console.error("Error in sendTokenUniversal:", error);
    
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
 * Legacy ERC-20 only function - kept for backward compatibility
 * @deprecated Use sendTokenUniversal instead
 */
export async function sendERC20TokenWithApproval(
  client: any,
  params: SendTokenParams
): Promise<SendTokenResult> {
  return sendTokenUniversal(client, params);
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
