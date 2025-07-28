# Designing a Cross-Chain Portfolio Rebalancing App with 1inch Fusion+ and Alchemy Account Abstraction

This document outlines a comprehensive and production-ready design for a cross-chain portfolio rebalancing application, leveraging 1inch Fusion+ for optimal swap execution and Alchemy Account Abstraction for advanced batching capabilities. The architecture is designed to start simple (single-chain on Base) and evolve into a sophisticated multi-chain solution, optimized for hackathon success and future scalability.

## Executive Summary

**Recommended Approach for Hackathon Success:**
1. **Start with 1inch Classic Swap API** on Base for single-chain rebalancing
2. **Use Alchemy Account Abstraction** for batching multiple swap transactions
3. **Implement modular architecture** that can easily integrate Fusion+ for cross-chain later
4. **Focus on UX and demo-ability** with clear portfolio visualization and one-click rebalancing

## 1. Core Questions and Strategic Answers

### How do I swap assets and batch rebalancing transactions using 1inch Fusion+ SDK?

**1inch Fusion+ SDK for Cross-Chain Swaps:**

The 1inch Fusion+ SDK enables intent-based, gasless, and MEV-protected swaps across chains. The workflow involves:

1. **Getting a Quote:** Use `sdk.getQuote(params)` with `srcChainId` and `dstChainId` for cross-chain swaps
2. **Creating an Order:** Use `sdk.createOrder(quote, params)` which involves EIP-712 signature and submission to the Fusion+ network
3. **Resolver Execution:** Resolvers pick up and execute orders automatically

**Critical Implementation Details:**
- Fusion+ orders are individual swap intents, not batch operations
- Each rebalancing swap (e.g., ETH→USDC, DAI→USDT) requires a separate Fusion+ order
- The SDK handles off-chain signing and order posting, not on-chain transaction batching

**Batching Strategy for Rebalancing:**
- **Single Chain:** Use Classic Swap API + Account Abstraction for batching
- **Cross-Chain:** Use Fusion+ for individual cross-chain swaps + AA for any on-chain approvals/interactions

### Does 1inch handle batching or will I need Alchemy smart accounts?

**1inch does NOT provide native batching for multiple distinct swap operations.**

**You MUST use Alchemy Account Abstraction for:**
- Batching multiple Classic Swap transactions
- Batching approval transactions before swaps
- Combining multiple on-chain interactions into single user operations
- Providing superior UX with one-click rebalancing

**Account Abstraction Benefits:**
- **Atomic Execution:** All swaps succeed or fail together
- **Gas Optimization:** Single transaction instead of multiple
- **Enhanced UX:** One signature for complex rebalancing
- **Gas Sponsorship:** Optional gas payment by the dApp

### How should I organize the swap logic for future cross-chain support?

**Modular Architecture Design:**

```typescript
// Core abstraction layer
interface ISwapProvider {
  getQuote(params: SwapQuoteParams): Promise<SwapQuote>;
  executeSwap(params: SwapExecutionParams): Promise<SwapResult>;
  getAllowance?(tokenAddress: string, walletAddress: string): Promise<string>;
  getApprovalTransaction?(tokenAddress: string, amount: string): Promise<TransactionRequest>;
}

// Implementation for different swap types
class ClassicSwapProvider implements ISwapProvider {
  // Handles single-chain swaps via 1inch Classic API
}

class FusionPlusSwapProvider implements ISwapProvider {
  // Handles cross-chain swaps via 1inch Fusion+ SDK
}

// Orchestration layer
class RebalancingOrchestrator {
  constructor(
    private classicProvider: ClassicSwapProvider,
    private fusionProvider: FusionPlusSwapProvider,
    private aaService: AccountAbstractionService
  ) {}
  
  async executeRebalancing(portfolio: Portfolio, targets: AllocationTargets): Promise<RebalancingResult> {
    // Determine required swaps
    // Route to appropriate providers
    // Batch via Account Abstraction
  }
}
```

### ETH handling in modular swap system?

**ETH Address Standardization:**
- Use `0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee` for native ETH in all 1inch APIs
- Create utility functions for address resolution:

```typescript
export const NATIVE_TOKEN_ADDRESS = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee';

export function resolveTokenAddress(address: string): string {
  if (address.toLowerCase() === 'eth' || address === NATIVE_TOKEN_ADDRESS) {
    return NATIVE_TOKEN_ADDRESS;
  }
  return address;
}

export function isNativeToken(address: string): boolean {
  return resolveTokenAddress(address) === NATIVE_TOKEN_ADDRESS;
}
```

### Would Alchemy's Account Abstraction work for batching multi-token rebalances?

**Yes, Alchemy Account Abstraction is PERFECT for this use case.**

**Implementation Strategy:**
1. **Calculate Required Swaps:** Determine what tokens to sell/buy for rebalancing
2. **Generate Approval Transactions:** For ERC-20 tokens that need allowance
3. **Generate Swap Transactions:** Using 1inch Classic Swap API
4. **Batch via AA:** Combine all transactions into a single user operation

```typescript
// Example batching implementation
async function executeRebalancing(
  swaps: RequiredSwap[],
  userAddress: string,
  smartAccountClient: AlchemySmartAccountClient
): Promise<string> {
  const transactions: TransactionRequest[] = [];
  
  for (const swap of swaps) {
    // Add approval if needed
    if (!isNativeToken(swap.srcToken) && needsApproval(swap)) {
      const approvalTx = await getApprovalTransaction(swap);
      transactions.push(approvalTx);
    }
    
    // Add swap transaction
    const swapTx = await getSwapTransaction(swap);
    transactions.push(swapTx);
  }
  
  // Execute all transactions atomically
  const userOpHash = await smartAccountClient.sendUserOperation({
    uo: transactions.map(tx => ({
      target: tx.to,
      data: tx.data,
      value: tx.value || 0n
    }))
  });
  
  return userOpHash;
}
```

## 2. Recommended 1inch Tools for Hackathon Success

### Primary Recommendation: 1inch Classic Swap API + Account Abstraction

**Why This Combination Wins:**
1. **Proven Reliability:** Classic Swap API is battle-tested and stable
2. **Perfect for Single-Chain:** Base ecosystem focus aligns with hackathon timeline
3. **Excellent Batching:** AA provides superior UX for multiple swaps
4. **Demo-Friendly:** Clear, predictable transaction flows for presentations
5. **Future-Proof:** Easy to add Fusion+ later for cross-chain expansion

**Implementation Priority:**
1. **Phase 1 (Hackathon):** Classic Swap + AA on Base
2. **Phase 2 (Post-Hackathon):** Add Fusion+ for cross-chain capabilities

### Secondary: 1inch Fusion+ for Cross-Chain (Future Enhancement)

**When to Use Fusion+:**
- Cross-chain rebalancing requirements
- MEV protection needs
- Gasless swap preferences
- Advanced intent-based trading

## 3. Production-Ready Architecture

### Core Services Structure

```typescript
// services/classicSwapService.ts
export class ClassicSwapService {
  private apiClient: AxiosInstance;
  
  constructor(baseURL: string, apiKey: string) {
    this.apiClient = axios.create({
      baseURL,
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });
  }
  
  async getQuote(params: ClassicSwapQuoteParams): Promise<ClassicSwapQuote> {
    const response = await this.apiClient.get(`/swap/v6.1/${params.chainId}/quote`, {
      params: {
        src: resolveTokenAddress(params.srcToken),
        dst: resolveTokenAddress(params.dstToken),
        amount: params.amount,
        from: params.fromAddress,
        slippage: params.slippage || 0.5
      }
    });
    return response.data;
  }
  
  async getSwapTransaction(params: ClassicSwapParams): Promise<TransactionRequest> {
    const response = await this.apiClient.get(`/swap/v6.1/${params.chainId}/swap`, {
      params: {
        src: resolveTokenAddress(params.srcToken),
        dst: resolveTokenAddress(params.dstToken),
        amount: params.amount,
        from: params.fromAddress,
        slippage: params.slippage,
        destReceiver: params.destReceiver
      }
    });
    return response.data.tx;
  }
  
  async getAllowance(
    chainId: string,
    tokenAddress: string,
    walletAddress: string
  ): Promise<bigint> {
    if (isNativeToken(tokenAddress)) return 0n;
    
    const response = await this.apiClient.get(`/swap/v6.1/${chainId}/approve/allowance`, {
      params: { tokenAddress, walletAddress }
    });
    return BigInt(response.data.allowance);
  }
  
  async getApprovalTransaction(
    chainId: string,
    tokenAddress: string,
    amount?: string
  ): Promise<TransactionRequest> {
    const response = await this.apiClient.get(`/swap/v6.1/${chainId}/approve/calldata`, {
      params: { tokenAddress, amount }
    });
    return response.data;
  }
}

// services/balanceService.ts
export class BalanceService {
  private apiClient: AxiosInstance;
  
  async getTokenBalances(
    chainId: string,
    walletAddress: string,
    tokenAddresses?: string[]
  ): Promise<TokenBalance[]> {
    const endpoint = tokenAddresses 
      ? `/balance/v1.2/${chainId}/balances/custom`
      : `/balance/v1.2/${chainId}/balances/${walletAddress}`;
      
    const response = tokenAddresses
      ? await this.apiClient.post(endpoint, {
          walletAddress,
          tokens: tokenAddresses.map(addr => ({ address: addr }))
        })
      : await this.apiClient.get(endpoint);
      
    return response.data;
  }
}

// services/priceService.ts
export class PriceService {
  async getTokenPrices(
    chainId: string,
    tokenAddresses: string[]
  ): Promise<Record<string, number>> {
    const response = await this.apiClient.get(`/price/v1.1/${chainId}`, {
      params: {
        tokens: tokenAddresses.join(','),
        currency: 'USD'
      }
    });
    return response.data;
  }
}

// services/accountAbstractionService.ts
export class AccountAbstractionService {
  async sendBatchedTransactions(
    smartAccountClient: AlchemySmartAccountClient,
    transactions: TransactionRequest[]
  ): Promise<string> {
    const userOperation = await smartAccountClient.buildUserOperation({
      uo: transactions.map(tx => ({
        target: tx.to as `0x${string}`,
        data: tx.data as `0x${string}`,
        value: BigInt(tx.value || 0)
      }))
    });
    
    const userOpHash = await smartAccountClient.sendUserOperation(userOperation);
    return userOpHash;
  }
  
  async waitForTransactionReceipt(
    smartAccountClient: AlchemySmartAccountClient,
    userOpHash: string
  ): Promise<any> {
    return await smartAccountClient.waitForUserOperationTransaction(userOpHash);
  }
}
```

### Rebalancing Engine

```typescript
// services/rebalancingEngine.ts
export class RebalancingEngine {
  constructor(
    private classicSwapService: ClassicSwapService,
    private balanceService: BalanceService,
    private priceService: PriceService,
    private aaService: AccountAbstractionService
  ) {}
  
  async calculateRebalancingSwaps(
    currentPortfolio: TokenBalance[],
    targetAllocations: AllocationTarget[],
    totalPortfolioValue: number
  ): Promise<RequiredSwap[]> {
    const swaps: RequiredSwap[] = [];
    
    // Calculate current vs target allocations
    for (const target of targetAllocations) {
      const currentToken = currentPortfolio.find(t => 
        t.address.toLowerCase() === target.tokenAddress.toLowerCase()
      );
      
      const currentValue = currentToken ? currentToken.usdValue : 0;
      const targetValue = totalPortfolioValue * target.percentage;
      const difference = targetValue - currentValue;
      
      if (Math.abs(difference) > 1) { // $1 minimum threshold
        if (difference > 0) {
          // Need to buy this token
          swaps.push({
            type: 'buy',
            tokenAddress: target.tokenAddress,
            usdAmount: difference,
            chainId: target.chainId
          });
        } else {
          // Need to sell this token
          swaps.push({
            type: 'sell',
            tokenAddress: target.tokenAddress,
            usdAmount: Math.abs(difference),
            chainId: target.chainId
          });
        }
      }
    }
    
    return this.optimizeSwapPairs(swaps);
  }
  
  private optimizeSwapPairs(swaps: RequiredSwap[]): RequiredSwap[] {
    // Convert buy/sell operations into direct swap pairs
    // This is a simplified version - production would need more sophisticated optimization
    const sellSwaps = swaps.filter(s => s.type === 'sell');
    const buySwaps = swaps.filter(s => s.type === 'buy');
    
    const optimizedSwaps: RequiredSwap[] = [];
    
    for (const sell of sellSwaps) {
      for (const buy of buySwaps) {
        if (sell.usdAmount > 0 && buy.usdAmount > 0) {
          const swapAmount = Math.min(sell.usdAmount, buy.usdAmount);
          
          optimizedSwaps.push({
            srcTokenAddress: sell.tokenAddress,
            dstTokenAddress: buy.tokenAddress,
            srcChainId: sell.chainId,
            dstChainId: buy.chainId,
            usdAmount: swapAmount,
            isCrossChain: sell.chainId !== buy.chainId
          });
          
          sell.usdAmount -= swapAmount;
          buy.usdAmount -= swapAmount;
        }
      }
    }
    
    return optimizedSwaps;
  }
  
  async executeRebalancing(
    swaps: RequiredSwap[],
    userAddress: `0x${string}`,
    smartAccountClient: AlchemySmartAccountClient
  ): Promise<string> {
    const transactions: TransactionRequest[] = [];
    
    // Process single-chain swaps first
    const singleChainSwaps = swaps.filter(s => !s.isCrossChain);
    
    for (const swap of singleChainSwaps) {
      // Convert USD amount to token amount
      const tokenAmount = await this.convertUsdToTokenAmount(
        swap.srcTokenAddress,
        swap.usdAmount,
        swap.srcChainId
      );
      
      // Check and add approval if needed
      if (!isNativeToken(swap.srcTokenAddress)) {
        const allowance = await this.classicSwapService.getAllowance(
          swap.srcChainId,
          swap.srcTokenAddress,
          userAddress
        );
        
        if (allowance < tokenAmount) {
          const approvalTx = await this.classicSwapService.getApprovalTransaction(
            swap.srcChainId,
            swap.srcTokenAddress,
            tokenAmount.toString()
          );
          transactions.push(approvalTx);
        }
      }
      
      // Add swap transaction
      const swapTx = await this.classicSwapService.getSwapTransaction({
        chainId: swap.srcChainId,
        srcToken: swap.srcTokenAddress,
        dstToken: swap.dstTokenAddress,
        amount: tokenAmount.toString(),
        fromAddress: userAddress,
        slippage: 0.5
      });
      transactions.push(swapTx);
    }
    
    // Execute batched transactions
    if (transactions.length > 0) {
      return await this.aaService.sendBatchedTransactions(
        smartAccountClient,
        transactions
      );
    }
    
    throw new Error('No transactions to execute');
  }
  
  private async convertUsdToTokenAmount(
    tokenAddress: string,
    usdAmount: number,
    chainId: string
  ): Promise<bigint> {
    const prices = await this.priceService.getTokenPrices(chainId, [tokenAddress]);
    const tokenPrice = prices[tokenAddress];
    
    if (!tokenPrice) {
      throw new Error(`Price not found for token ${tokenAddress}`);
    }
    
    // Get token decimals (you'd need to implement this)
    const decimals = await this.getTokenDecimals(tokenAddress, chainId);
    const tokenAmount = (usdAmount / tokenPrice) * Math.pow(10, decimals);
    
    return BigInt(Math.floor(tokenAmount));
  }
  
  private async getTokenDecimals(tokenAddress: string, chainId: string): Promise<number> {
    if (isNativeToken(tokenAddress)) return 18;
    
    // Implementation would call Token API or use contract call
    // For now, return common default
    return 18;
  }
}
```

### React Hooks for UI Integration

```typescript
// hooks/useRebalancing.ts
export function useRebalancing() {
  const [isRebalancing, setIsRebalancing] = useState(false);
  const [rebalancingStatus, setRebalancingStatus] = useState<string>('');
  
  const executeRebalancing = useCallback(async (
    targetAllocations: AllocationTarget[],
    smartAccountClient: AlchemySmartAccountClient
  ) => {
    setIsRebalancing(true);
    setRebalancingStatus('Calculating required swaps...');
    
    try {
      // Get current portfolio
      const portfolio = await balanceService.getTokenBalances(
        CHAIN_ID,
        userAddress
      );
      
      // Calculate swaps
      const swaps = await rebalancingEngine.calculateRebalancingSwaps(
        portfolio,
        targetAllocations,
        calculateTotalValue(portfolio)
      );
      
      setRebalancingStatus('Executing swaps...');
      
      // Execute rebalancing
      const userOpHash = await rebalancingEngine.executeRebalancing(
        swaps,
        userAddress,
        smartAccountClient
      );
      
      setRebalancingStatus('Waiting for confirmation...');
      
      // Wait for completion
      await aaService.waitForTransactionReceipt(smartAccountClient, userOpHash);
      
      setRebalancingStatus('Rebalancing completed!');
      
      return userOpHash;
    } catch (error) {
      setRebalancingStatus(`Error: ${error.message}`);
      throw error;
    } finally {
      setIsRebalancing(false);
    }
  }, [userAddress]);
  
  return {
    executeRebalancing,
    isRebalancing,
    rebalancingStatus
  };
}

// hooks/usePortfolio.ts
export function usePortfolio(userAddress: string, chainId: string) {
  const [portfolio, setPortfolio] = useState<TokenBalance[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const refreshPortfolio = useCallback(async () => {
    if (!userAddress) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const balances = await balanceService.getTokenBalances(chainId, userAddress);
      const prices = await priceService.getTokenPrices(
        chainId,
        balances.map(b => b.address)
      );
      
      const portfolioWithPrices = balances.map(balance => ({
        ...balance,
        usdValue: (balance.balance / Math.pow(10, balance.decimals)) * prices[balance.address],
        price: prices[balance.address]
      }));
      
      setPortfolio(portfolioWithPrices);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userAddress, chainId]);
  
  useEffect(() => {
    refreshPortfolio();
  }, [refreshPortfolio]);
  
  return {
    portfolio,
    loading,
    error,
    refreshPortfolio
  };
}
```

## 4. CORS Proxy Setup (Vercel)

Since 1inch APIs require authorization tokens and have CORS restrictions, you MUST use a proxy:

```typescript
// api/1inch-proxy.ts (Vercel API route)
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { path, ...params } = req.query;
  const apiPath = Array.isArray(path) ? path.join('/') : path;
  
  const url = new URL(`https://api.1inch.dev/${apiPath}`);
  Object.entries(params).forEach(([key, value]) => {
    if (typeof value === 'string') {
      url.searchParams.append(key, value);
    }
  });
  
  try {
    const response = await fetch(url.toString(), {
      method: req.method,
      headers: {
        'Authorization': `Bearer ${process.env.ONEINCH_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined,
    });
    
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: 'Proxy request failed' });
  }
}

// utils/apiClient.ts
import axios from 'axios';

export const apiClient = axios.create({
  baseURL: '/api/1inch-proxy',
  timeout: 30000,
});
```

## 5. Common Pitfalls and Solutions

### Rate Limiting
- **Problem:** 1inch APIs have rate limits
- **Solution:** Implement request queuing and caching
- **Code:** Use libraries like `bottleneck` for rate limiting

### Slippage Handling
- **Problem:** Price movements during execution
- **Solution:** Dynamic slippage calculation based on volatility
- **Code:** Implement volatility-based slippage adjustment

### Allowances
- **Problem:** Insufficient token allowances
- **Solution:** Proactive allowance checking and batched approvals
- **Code:** Always check allowance before swaps, batch approvals

### Network Switching
- **Problem:** User on wrong network
- **Solution:** Automatic network switching with user consent
- **Code:** Use wagmi's `useSwitchNetwork` hook

### Gas Estimation
- **Problem:** Failed transactions due to gas issues
- **Solution:** Dynamic gas estimation with buffers
- **Code:** Add 20% buffer to estimated gas limits

## 6. Recommended File Structure

```
src/
├── components/
│   ├── Portfolio/
│   │   ├── PortfolioOverview.tsx
│   │   ├── TokenBalance.tsx
│   │   └── AllocationChart.tsx
│   ├── Rebalancing/
│   │   ├── RebalancingForm.tsx
│   │   ├── SwapPreview.tsx
│   │   └── RebalancingStatus.tsx
│   └── UI/
│       ├── Button.tsx
│       ├── Modal.tsx
│       └── LoadingSpinner.tsx
├── hooks/
│   ├── usePortfolio.ts
│   ├── useRebalancing.ts
│   ├── useTokenPrices.ts
│   └── useAccountAbstraction.ts
├── services/
│   ├── classicSwapService.ts
│   ├── fusionPlusService.ts
│   ├── balanceService.ts
│   ├── priceService.ts
│   ├── tokenService.ts
│   └── accountAbstractionService.ts
├── utils/
│   ├── apiClient.ts
│   ├── tokenUtils.ts
│   ├── formatters.ts
│   └── constants.ts
├── types/
│   ├── portfolio.ts
│   ├── swap.ts
│   ├── token.ts
│   └── api.ts
├── config/
│   ├── chains.ts
│   ├── tokens.ts
│   └── environment.ts
└── pages/
    ├── api/
    │   └── 1inch-proxy/
    │       └── [...path].ts
    ├── dashboard.tsx
    ├── rebalance.tsx
    └── portfolio.tsx
```

## 7. Hackathon Success Strategy

### MVP Features (Day 1-2)
1. **Portfolio Display:** Show current token balances and USD values
2. **Target Setting:** Allow users to set desired allocation percentages
3. **Swap Preview:** Display required swaps for rebalancing

### Core Features (Day 3-4)
1. **Classic Swap Integration:** Implement single-chain swaps
2. **Account Abstraction:** Batch multiple swaps
3. **Real-time Updates:** Live portfolio tracking

### Polish Features (Day 5)
1. **UI/UX Enhancement:** Clean, professional interface
2. **Error Handling:** Comprehensive error states
3. **Demo Preparation:** Smooth demo flow

### Winning Differentiators
1. **One-Click Rebalancing:** Superior UX via Account Abstraction
2. **Real-time Portfolio Tracking:** Live updates and visualizations
3. **Gas Optimization:** Batched transactions reduce costs
4. **Professional UI:** Clean, intuitive interface
5. **Comprehensive 1inch Integration:** Multiple APIs working together

This architecture provides a solid foundation for hackathon success while maintaining the flexibility to evolve into a full-featured cross-chain portfolio management platform.

