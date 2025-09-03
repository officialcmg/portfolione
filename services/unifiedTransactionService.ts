import { type Transaction, type RebalanceResult } from './classicSwapService';

// Unified transaction client interface
export interface UnifiedTransactionClient {
  address: string;
  sendBatchedTransactions: (transactions: Transaction[]) => Promise<RebalanceResult>;
}

// Alchemy Account Kit client wrapper
export class AlchemyTransactionClient implements UnifiedTransactionClient {
  constructor(private client: any) {}

  get address(): string {
    return this.client?.account?.address || '';
  }

  async sendBatchedTransactions(transactions: Transaction[]): Promise<RebalanceResult> {
    try {
      if (!this.client?.account?.address) {
        throw new Error("Smart account client not available");
      }

      if (!transactions || transactions.length === 0) {
        throw new Error("No transactions to execute");
      }

      console.log(`🔗 Alchemy: Batching ${transactions.length} transactions into single UserOperation`);

      // Convert transactions to UserOperation format
      const userOperations = transactions.map(tx => ({
        target: tx.to as `0x${string}`,
        data: tx.data as `0x${string}`,
        value: BigInt(tx.value || "0")
      }));

      // Send batched UserOperation using Account Kit
      const userOpResult = await this.client.sendUserOperation({
        uo: userOperations
      });

      const userOpHash = typeof userOpResult === 'string' ? userOpResult : userOpResult.hash;
      console.log(`✅ Alchemy UserOperation submitted: ${userOpHash}`);

      // Wait for the transaction to be mined
      const txHash = await this.client.waitForUserOperationTransaction({
        hash: userOpHash
      });

      return {
        success: true,
        txHash,
        userOpHash,
        transactionCount: transactions.length
      };

    } catch (error) {
      console.error('❌ Alchemy transaction error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Alchemy transaction failed",
        transactionCount: transactions.length
      };
    }
  }
}

// MiniKit/Wagmi client wrapper
export class MiniKitTransactionClient implements UnifiedTransactionClient {
  constructor(
    private _address: string,
    private sendCalls: (params: any) => Promise<string>
  ) {}

  get address(): string {
    return this._address;
  }

  async sendBatchedTransactions(transactions: Transaction[]): Promise<RebalanceResult> {
    try {
      if (!this._address) {
        throw new Error("Wallet address not available");
      }

      if (!transactions || transactions.length === 0) {
        throw new Error("No transactions to execute");
      }

      console.log(`📱 MiniKit: Batching ${transactions.length} transactions using wallet_sendCalls`);

      // Convert transactions to wallet_sendCalls format
      const calls = transactions.map(tx => ({
        to: tx.to as `0x${string}`,
        data: tx.data as `0x${string}`,
        value: BigInt(tx.value || "0")
      }));

      console.log(`Transaction types: ${transactions.map(tx => tx.type).join(' → ')}`);
      
      // Log transaction details for debugging
      transactions.forEach((tx, index) => {
        console.log(`  ${index + 1}. ${tx.type}: ${tx.description}`);
        if (tx.toAmount) {
          console.log(`     Expected output: ${tx.toAmount} wei`);
        }
      });

      // Send batched calls using Wagmi's useSendCalls
      console.log('🚀 Submitting batched calls via wallet_sendCalls...');
      const callsId = await this.sendCalls({ calls });
      
      console.log(`✅ MiniKit calls submitted: ${callsId}`);

      return {
        success: true,
        txHash: callsId, // In MiniKit, this is the calls ID
        transactionCount: transactions.length
      };

    } catch (error) {
      console.error('❌ MiniKit transaction error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "MiniKit transaction failed",
        transactionCount: transactions.length
      };
    }
  }
}

// Factory function to create the appropriate client based on context
export function createUnifiedTransactionClient(
  alchemyClient?: any,
  miniKitAddress?: string,
  miniKitSendCalls?: (params: any) => Promise<string>,
  isMiniApp?: boolean
): UnifiedTransactionClient | null {
  
  // Priority 1: Use MiniKit/Wagmi in miniapp context (Farcaster)
  if (isMiniApp && miniKitAddress && miniKitSendCalls) {
    console.log('📱 Using MiniKit/Wagmi client for transactions (miniapp context)');
    return new MiniKitTransactionClient(miniKitAddress, miniKitSendCalls);
  }
  
  // Priority 2: Use Alchemy client for web/email authentication
  if (!isMiniApp && alchemyClient?.account?.address) {
    console.log('🔗 Using Alchemy Account Kit client for transactions (web context)');
    return new AlchemyTransactionClient(alchemyClient);
  }
  
  console.warn('⚠️ No transaction client available', { isMiniApp, miniKitAddress: !!miniKitAddress, alchemyClient: !!alchemyClient?.account?.address });
  return null;
}