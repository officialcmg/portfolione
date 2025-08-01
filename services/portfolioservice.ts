import axios from "axios";

// API Response Types
interface UnderlyingToken {
  decimals: number;
  value_usd: number;
  amount: string;
}

interface PortfolioTokenResponse {
  contract_name: string;
  contract_address: string;
  contract_symbol: string;
  underlying_tokens: UnderlyingToken[];
}

interface PortfolioApiResponse {
  result: PortfolioTokenResponse[];
}

interface TokenMetadata {
  logoURI?: string;
}

type TokenMetadataResponse = Record<string, TokenMetadata>;

// Export Types
export interface PortfolioToken {
  name: string;
  address: string;
  symbol: string;
  decimals: number;
  value_usd: number;
  amount: number;
  logoURI: string | null;
}

// Fetch portfolio tokens for a user
export async function fetchPortfolioTokens(userAddress: string): Promise<PortfolioApiResponse> {
    const url = "https://1inch-proxy-prtfl.vercel.app/portfolio/portfolio/v5.0/tokens/snapshot";
  
    const config = {
      params: {
        addresses: [userAddress],
        chain_id: "8453",
      },
      paramsSerializer: {
        indexes: null,
      },
    };
  
    try {
      const response = await axios.get(url, config);
      return response.data;
    } catch (error) {
      console.error('Error fetching portfolio tokens:', error);
      throw error;
    }
  }
  
// Fetch token metadata including logoURIs
export async function fetchTokenMetadata(contractAddresses: string[]): Promise<TokenMetadataResponse> {
    const url = "https://1inch-proxy-prtfl.vercel.app/token/v1.3/8453/custom";
  
    const config = {
      params: {
        addresses: contractAddresses,
      },
      paramsSerializer: {
        indexes: null,
      },
    };
  
    try {
      const response = await axios.get(url, config);
      return response.data;
    } catch (error) {
      console.error('Error fetching token metadata:', error);
      throw error;
    }
  }
  
// Single function to fetch and process portfolio tokens
export async function fetchProcessedPortfolio(userAddress: string): Promise<PortfolioToken[]> {
    try {
      console.log('🔍 Fetching portfolio for address:', userAddress);
      
      // Step 1: Fetch portfolio tokens
      const portfolioData = await fetchPortfolioTokens(userAddress);
      console.log('📊 Raw portfolio data received:', {
        totalTokens: portfolioData.result?.length || 0,
        tokens: portfolioData.result?.map(t => ({ name: t.contract_name, symbol: t.contract_symbol, address: t.contract_address }))
      });
      
      // Step 2: Extract contract addresses for metadata lookup
      const contractAddresses = portfolioData.result
        .filter(token => token.underlying_tokens && token.underlying_tokens.length > 0)
        .map(token => token.contract_address);
      
      console.log('🏷️ Fetching metadata for', contractAddresses.length, 'tokens:', contractAddresses);
      
      // Step 3: Fetch token metadata (including logoURIs)
      const tokenMetadata = await fetchTokenMetadata(contractAddresses);
      console.log('🖼️ Token metadata received for', Object.keys(tokenMetadata).length, 'tokens');
      
      // Step 4: Process and return clean token array
      const processedTokens: PortfolioToken[] = [];
  
      portfolioData.result.forEach(token => {
        // Skip tokens without underlying_tokens or with empty underlying_tokens
        if (!token.underlying_tokens || token.underlying_tokens.length === 0) {
          console.log(`Skipping ${token.contract_name} - no underlying tokens`);
          return;
        }
  
        // Get the first (and usually only) underlying token
        const underlyingToken = token.underlying_tokens[0];
        
        // Get logoURI from metadata (use contract_address as key)
        const metadata = tokenMetadata[token.contract_address.toLowerCase()];
        const logoURI = metadata?.logoURI || null;
  
        // Create clean token object with only requested fields
        const processedToken: PortfolioToken = {
          name: token.contract_name,
          address: token.contract_address,
          symbol: token.contract_symbol,
          decimals: underlyingToken.decimals,
          value_usd: underlyingToken.value_usd,
          amount: parseFloat(underlyingToken.amount),
          logoURI: logoURI
        };
  
        processedTokens.push(processedToken);
      });
  
      // Filter out tokens with zero USD value
      const filteredTokens = processedTokens.filter(token => token.value_usd > 0);
      
      console.log('✅ Portfolio processing complete:', {
        totalProcessed: processedTokens.length,
        afterFiltering: filteredTokens.length,
        totalValue: filteredTokens.reduce((sum, token) => sum + token.value_usd, 0).toFixed(2),
        tokens: filteredTokens.map(t => ({ 
          symbol: t.symbol, 
          value: t.value_usd.toFixed(2), 
          amount: t.amount.toFixed(6) 
        }))
      });
      
      return filteredTokens;
      
    } catch (error) {
      console.error('Error processing portfolio:', error);
      throw error;
    }
  }

