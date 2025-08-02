import { type PortfolioToken } from "./portfolioService";

// Extended interface for tokens with target allocations
export interface PortfolioTokenWithTarget extends PortfolioToken {
  target_value_usd: number;
  target_amount: number;
}

export interface SwapInstruction {
  fromToken: string;    // contract address
  toToken: string;      // contract address
  fromSymbol: string;   // for logging/display
  toSymbol: string;     // for logging/display
  amountInWei: string;  // amount to swap in wei
  amountUsd: number;    // USD value for display
}

interface TokenDelta {
  address: string;
  symbol: string;
  decimals: number;
  currentUsd: number;
  targetUsd: number;
  deltaUsd: number;     // Positive = need to buy, Negative = need to sell
  currentPrice: number;
}

// Helper function to convert USD amount to wei
function usdToTokenWei(usdAmount: number, tokenPrice: number, decimals: number): string {
  const tokenAmount = usdAmount / tokenPrice;
  // Convert to wei and ensure it's a whole number (no decimals)
  const amountInWei = Math.floor(tokenAmount * Math.pow(10, decimals));
  return amountInWei.toString();
}
  
// Step 1: Calculate deltas for each token
function calculateDeltas(tokensWithTargets: PortfolioTokenWithTarget[]): TokenDelta[] {
  const deltas: TokenDelta[] = [];
  
  tokensWithTargets.forEach(token => {
    const deltaUsd = token.target_value_usd - token.value_usd;
    
    // Only process tokens with significant changes (> $0.01)
    if (Math.abs(deltaUsd) > 0.01) {
      const currentPrice = token.value_usd / token.amount;
      
      deltas.push({
        address: token.address,
        symbol: token.symbol,
        decimals: token.decimals,
        currentUsd: token.value_usd,
        targetUsd: token.target_value_usd,
        deltaUsd, // Positive = need to buy, Negative = need to sell
        currentPrice
      });
    }
  });
  
  return deltas;
}
  
// Step 2: Separate surplus (sell) and deficit (buy) tokens
function separateSurplusDeficit(deltas: TokenDelta[]): { surplus: TokenDelta[], deficit: TokenDelta[] } {
  const surplus = deltas.filter(d => d.deltaUsd < -0.01); // Need to sell
  const deficit = deltas.filter(d => d.deltaUsd > 0.01);   // Need to buy
  
  // Sort by magnitude for optimal matching
  surplus.sort((a, b) => a.deltaUsd - b.deltaUsd); // Most negative first
  deficit.sort((a, b) => b.deltaUsd - a.deltaUsd); // Most positive first
  
  return { surplus, deficit };
}
  
// Step 3: Generate optimal swap pairs using greedy matching
function generateOptimalSwapPairs(surplus: TokenDelta[], deficit: TokenDelta[]): SwapInstruction[] {
  const swaps: SwapInstruction[] = [];
  const surplusCopy = [...surplus];
  const deficitCopy = [...deficit];
  
  // Greedy matching: pair largest surplus with largest deficit
  while (surplusCopy.length > 0 && deficitCopy.length > 0) {
    const sellToken = surplusCopy[0];
    const buyToken = deficitCopy[0];
    
    // Determine swap amount (limited by smaller absolute value)
    const sellAmount = Math.abs(sellToken.deltaUsd);
    const buyAmount = Math.abs(buyToken.deltaUsd);
    const swapAmountUsd = Math.min(sellAmount, buyAmount);
    
    // Convert USD to wei amount for the sell token
    const amountInWei = usdToTokenWei(
      swapAmountUsd, 
      sellToken.currentPrice, 
      sellToken.decimals
    );
    
    // Create swap instruction
    swaps.push({
      fromToken: sellToken.address,
      toToken: buyToken.address,
      fromSymbol: sellToken.symbol,
      toSymbol: buyToken.symbol,
      amountInWei,
      amountUsd: swapAmountUsd
    });
    
    // Update remaining deltas
    sellToken.deltaUsd += swapAmountUsd; // Reduce surplus
    buyToken.deltaUsd -= swapAmountUsd;  // Reduce deficit
    
    // Remove tokens that are now balanced
    if (Math.abs(sellToken.deltaUsd) < 0.01) {
      surplusCopy.shift();
    }
    if (Math.abs(buyToken.deltaUsd) < 0.01) {
      deficitCopy.shift();
    }
  }
  
  return swaps;
}
  
// Main function: Generate optimal swaps from portfolio tokens with targets
export function generateOptimalSwaps(tokensWithTargets: PortfolioTokenWithTarget[]): SwapInstruction[] {
  console.log('\n=== GENERATING OPTIMAL SWAPS ===');
  console.log(`Processing ${tokensWithTargets.length} tokens`);
  
  // Step 1: Calculate deltas
  const deltas = calculateDeltas(tokensWithTargets);
  console.log(`Found ${deltas.length} tokens needing rebalancing`);
  
  if (deltas.length === 0) {
    console.log('No rebalancing needed - all tokens are within target ranges');
    return [];
  }
  
  // Step 2: Separate surplus and deficit
  const { surplus, deficit } = separateSurplusDeficit(deltas);
  console.log(`Surplus tokens (sell): ${surplus.length}`);
  console.log(`Deficit tokens (buy): ${deficit.length}`);
  
  // Log surplus tokens
  surplus.forEach(token => {
    console.log(`  Sell ${token.symbol}: $${Math.abs(token.deltaUsd).toFixed(2)}`);
  });
  
  // Log deficit tokens
  deficit.forEach(token => {
    console.log(`  Buy ${token.symbol}: $${token.deltaUsd.toFixed(2)}`);
  });
  
  // Step 3: Generate optimal swap pairs
  const swaps = generateOptimalSwapPairs(surplus, deficit);
  console.log(`\nGenerated ${swaps.length} optimal swaps:`);
  
  swaps.forEach((swap, index) => {
    console.log(`  ${index + 1}. Swap $${swap.amountUsd.toFixed(2)} ${swap.fromSymbol} → ${swap.toSymbol}`);
    console.log(`     Amount: ${swap.amountInWei} wei`);
  });
  
  return swaps;
}

// Export utility function
export { usdToTokenWei };