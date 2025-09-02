import axios from 'axios';
import { type SwapInstruction } from './swapOptimizingService';
import { type UnifiedTransactionClient } from './unifiedTransactionService';

// TypeScript interfaces for 1inch API responses and transactions
export interface Transaction {
  to: string;           // Contract address to call
  data: string;         // Encoded function call (calldata)
  value: string;        // ETH value (usually "0" for token operations)
  type: 'approval' | 'swap';  // Transaction type for debugging
  description?: string; // Human readable description
  toAmount?: string;    // Expected output amount (for swaps)
  protocols?: any[];    // 1inch protocol routing info
}

export interface RebalanceResult {
  success: boolean;
  txHash?: string;
  userOpHash?: string;
  error?: string;
  transactionCount?: number;
}

// Get approval transaction from 1inch API via your proxy
async function get1inchApprovalTransaction(tokenAddress: string, amount: string): Promise<Transaction | null> {
  // Skip approval for native ETH
  if (tokenAddress === "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee") {
    return null;
  }

  const url = "https://1inch-proxy-prtfl.vercel.app/swap/v6.0/8453/approve/transaction";
  
  const params = {
    tokenAddress: tokenAddress,
    amount: amount
  };

  const config = {
    params
  };

  try {
    console.log(`Getting approval transaction for ${tokenAddress}, amount: ${amount}`);
    const response = await axios.get(url, config);
    
    return {
      to: response.data.to,
      data: response.data.data,
      value: response.data.value || "0",
      type: 'approval',
      description: `Approve ${tokenAddress} spending`
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorData = (error as any)?.response?.data;
    console.error('Error getting 1inch approval transaction:', errorData || errorMessage);
    throw error;
  }
}

// Get swap transaction from 1inch API via your proxy
async function get1inchSwapTransaction(
  fromToken: string, 
  toToken: string, 
  amount: string, 
  userAddress: string
): Promise<Transaction> {
  const url = "https://1inch-proxy-prtfl.vercel.app/swap/v6.0/8453/swap";
  
  const params = {
    src: fromToken,
    dst: toToken,
    amount: amount,
    from: userAddress,
    origin: userAddress, // EOA that initiates the transaction
    slippage: 2, // hardcode in here 
    disableEstimate: true,
    allowPartialFill: false,
    includeTokensInfo: false,
    includeProtocols: false,
    includeGasInfo: false
  };

  const config = {
    params
  };

  try {
    console.log(`Getting swap transaction: ${fromToken} → ${toToken}, amount: ${amount}`);
    const response = await axios.get(url, config);
    
    return {
      to: response.data.tx.to,
      data: response.data.tx.data,
      value: response.data.tx.value || "0",
      type: 'swap',
      description: `Swap ${fromToken} to ${toToken}`,
      // Additional 1inch response data
      toAmount: response.data.toAmount,
      protocols: response.data.protocols
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorData = (error as any)?.response?.data;
    console.error('Error getting 1inch swap transaction:', errorData || errorMessage);
    throw error;
  }
}

// Main function: Convert swap instructions to executable transactions
export async function generateTransactionsFromSwaps(
  swapInstructions: SwapInstruction[], 
  userAddress: string
): Promise<Transaction[]> {
  console.log('\n=== GENERATING TRANSACTIONS FROM SWAPS ===');
  console.log(`Processing ${swapInstructions.length} swap instructions`);
  
  const transactions: Transaction[] = [];
  
  try {
    for (let i = 0; i < swapInstructions.length; i++) {
      const swap = swapInstructions[i];
      console.log(`\n--- Processing Swap ${i + 1}/${swapInstructions.length} ---`);
      console.log(`${swap.fromSymbol} → ${swap.toSymbol} ($${swap.amountUsd.toFixed(2)})`);
      
      // Step 1: Get approval transaction from 1inch API via proxy
      const approvalTx = await get1inchApprovalTransaction(
        swap.fromToken,
        swap.amountInWei
      );
      
      if (approvalTx) {
        transactions.push(approvalTx);
        console.log(`✅ Added approval transaction`);
      } else {
        console.log(`⏭️  Skipped approval (native ETH)`);
      }
      
      // Step 2: Generate swap transaction
      const swapTx = await get1inchSwapTransaction(
        swap.fromToken,
        swap.toToken,
        swap.amountInWei,
        userAddress
      );
      
      transactions.push(swapTx);
      console.log(`✅ Added swap transaction`);
      console.log(`   Expected output: ${swapTx.toAmount || 'unknown'} wei`);
    }
    
    console.log(`\n=== TRANSACTION GENERATION COMPLETE ===`);
    console.log(`Generated ${transactions.length} total transactions`);
    console.log(`Transaction order: ${transactions.map(tx => tx.type).join(' → ')}`);
    
    return transactions;
    
  } catch (error) {
    console.error('Error generating transactions:', error);
    throw error;
  }
}

/**
 * Execute portfolio rebalancing using unified transaction client
 * Works with both Alchemy Account Kit and MiniKit/Wagmi clients
 * 
 * @param client - UnifiedTransactionClient (Alchemy or MiniKit)
 * @param transactions - Array of transactions to batch (approvals + swaps)
 * @returns Promise<RebalanceResult> - Result with transaction hash and success status
 */
export async function rebalancePortfolio(
  client: UnifiedTransactionClient,
  transactions: Transaction[]
): Promise<RebalanceResult> {
  try {
    // Input validation
    if (!client?.address) {
      throw new Error("Transaction client not available");
    }

    if (!transactions || transactions.length === 0) {
      throw new Error("No transactions to execute");
    }

    console.log(`\n=== EXECUTING PORTFOLIO REBALANCE ===`);
    console.log(`Batching ${transactions.length} transactions`);
    console.log(`Account: ${client.address}`);

    // Use the unified client to send batched transactions
    const result = await client.sendBatchedTransactions(transactions);

    if (result.success) {
      console.log(`🎉 Portfolio rebalancing complete!`);
      console.log(`Transaction hash: ${result.txHash}`);
      if (result.userOpHash) {
        console.log(`UserOperation hash: ${result.userOpHash}`);
      }
    }

    return result;

  } catch (error) {
    console.error('❌ Error in portfolio rebalancing:', error);
    
    let errorMessage = "Portfolio rebalancing failed";
    if (error instanceof Error) {
      errorMessage = error.message;
    } else if (typeof error === "string") {
      errorMessage = error;
    }

    return {
      success: false,
      error: errorMessage,
      transactionCount: transactions.length
    };
  }
}

/**
 * Complete end-to-end portfolio rebalancing
 * Takes swap instructions, generates transactions, and executes them
 * 
 * @param client - UnifiedTransactionClient (Alchemy or MiniKit)
 * @param swapInstructions - Array of optimal swap instructions from swapOptimizingService
 * @param userAddress - User's wallet address
 * @returns Promise<RebalanceResult> - Complete rebalancing result
 */
export async function executePortfolioRebalancing(
  client: UnifiedTransactionClient,
  swapInstructions: SwapInstruction[],
  userAddress: string
): Promise<RebalanceResult> {
  try {
    console.log('\n🎯 STARTING COMPLETE PORTFOLIO REBALANCING');
    console.log(`User: ${userAddress}`);
    console.log(`Swaps to execute: ${swapInstructions.length}`);

    // Step 1: Generate transactions from swap instructions
    const transactions = await generateTransactionsFromSwaps(swapInstructions, userAddress);
    
    // Step 2: Execute the batched rebalancing using unified client
    const result = await rebalancePortfolio(client, transactions);
    
    if (result.success) {
      console.log('\n🚀 PORTFOLIO REBALANCING SUCCESSFUL!');
      console.log(`✅ Executed ${result.transactionCount} transactions`);
      console.log(`📋 Transaction: ${result.txHash}`);
    } else {
      console.log('\n❌ PORTFOLIO REBALANCING FAILED');
      console.log(`Error: ${result.error}`);
    }

    return result;

  } catch (error) {
    console.error('Fatal error in executePortfolioRebalancing:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error in rebalancing execution"
    };
  }
}
