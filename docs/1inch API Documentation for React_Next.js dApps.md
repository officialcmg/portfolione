# 1inch API Documentation for React/Next.js dApps

This document provides a comprehensive guide to integrating with various 1inch APIs for a React/Next.js decentralized application (dApp). It covers Classic Swap, Fusion+ (Cross-Chain Swap), Balance, Price Feeds, Token Metadata, Web3 RPC, and Limit Order APIs, detailing their endpoints, request/response structures, usage, error handling, and practical tips. A recommended file structure for composability is also included.

## 1. 1inch Classic Swap API (Aggregation Protocol)

The 1inch Classic Swap API (formerly known as the Aggregation Protocol) is the core of 1inch's DEX aggregation service. It finds the most efficient swap paths across numerous decentralized exchanges on a single blockchain, ensuring users get the best possible rates. This API is crucial for single-chain rebalancing within your portfolio rebalancing dApp.

**Base URL:** `https://api.1inch.dev/swap/v6.1/{chain_id}`

### 1.1. Get Quote

**Purpose:** Retrieves the best quote for a token swap, including the estimated return amount and gas cost, without actually executing the swap. This is essential for displaying swap details to the user before they confirm.

**Method:** `GET`

**Endpoint:** `/{chain_id}/quote`

**Parameters:**

*   `src` (string, required): The address of the token you want to sell. For native blockchain currency (e.g., ETH on Ethereum, BNB on BSC, MATIC on Polygon, Base ETH on Base), use `0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee`.
*   `dst` (string, required): The address of the token you want to buy. For native blockchain currency, use `0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee`.
*   `amount` (string, required): The amount of the source token you want to sell, in its smallest unit (e.g., Wei for ETH, or smallest decimal unit for ERC-20 tokens). For example, to swap 1 ETH, `amount` would be `1000000000000000000`.
*   `from` (string, optional): The address of the wallet that will perform the swap. While optional for the quote, it's good practice to include it for more accurate gas estimations, especially if the user has a smart account.
*   `slippage` (number, optional): The maximum acceptable slippage percentage (e.g., `0.5` for 0.5%). If the price moves unfavorably beyond this percentage, the transaction will revert. Default is usually 0.5% if not specified.
*   `protocols` (string, optional): Comma-separated list of protocol addresses to include or exclude from the routing. Useful for advanced use cases where you want to restrict liquidity sources.
*   `fee` (number, optional): The percentage of the `dst` token amount to be taken as a fee. This fee is paid to the `feeRecipient`.
*   `gasLimit` (number, optional): Custom gas limit for the transaction. If not provided, the API estimates it.
*   `gasPrice` (string, optional): Custom gas price in Wei. If not provided, the API uses the current network gas price.
*   `complexityLevel` (number, optional): Controls the complexity of the routing algorithm. Higher levels might find better rates but take longer.
*   `connector` (string, optional): Address of the token to use as a connector in multi-hop swaps.
*   `allowPartialFill` (boolean, optional): Allows the swap to be partially filled. Default is `false`.
*   `disableEstimate` (boolean, optional): Disables gas estimation. Default is `false`.
*   `destReceiver` (string, optional): Address to receive the destination tokens. If not specified, `from` address receives tokens.
*   `burnChi` (boolean, optional): Whether to burn CHI tokens for gas refund. Default is `false`.
*   `allowUtxo` (boolean, optional): Allows UTXO-based tokens (e.g., WBTC) to be used. Default is `true`.
*   `parts` (number, optional): The number of parts to split the swap into for better routing. Default is `1`.
*   `mainRouteParts` (number, optional): The number of parts for the main route. Default is `1`.
*   `maxTokens` (number, optional): Maximum number of tokens to use in the swap path. Default is `3`.

**Example Request (using `axios` via proxy):**

```typescript
// services/classicSwapService.ts (excerpt)
import apiClient from "../utils/apiClient";
import { resolveTokenAddress, ETH_NATIVE_IDENTIFIER } from "../utils/tokenUtils";
import { ChainId } from "../config/chains";

export const ClassicSwapService = {
  getQuote: async (
    chainId: ChainId,
    srcTokenAddress: string,
    dstTokenAddress: string,
    amount: string
  ): Promise<any> => {
    try {
      const resolvedSrc = resolveTokenAddress(srcTokenAddress);
      const resolvedDst = resolveTokenAddress(dstTokenAddress);

      const response = await apiClient.get(`swap/v6.1/${chainId}/quote`, {
        params: {
          src: resolvedSrc,
          dst: resolvedDst,
          amount,
        },
      });
      return response.data;
    } catch (error: any) {
      console.error("Error fetching classic swap quote:", error.response?.data || error.message);
      throw error;
    }
  },
};

// Example usage in a React component or hook:
// const quote = await ClassicSwapService.getQuote(
//   "8453", // Base Chain ID
//   ETH_NATIVE_IDENTIFIER, // Selling native ETH
//   "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913", // Buying USDC on Base
//   "100000000000000000" // 0.1 ETH
// );
// console.log(quote);
```

**Example Response (simplified):**

```json
{
  "fromToken": {
    "symbol": "ETH",
    "name": "Ethereum",
    "address": "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
    "decimals": 18,
    "logoURI": "https://tokens.1inch.io/0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee.png"
  },
  "toToken": {
    "symbol": "USDC",
    "name": "USD Coin",
    "address": "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
    "decimals": 6,
    "logoURI": "https://tokens.1inch.io/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.png"
  },
  "toTokenAmount": "35000000000", // Amount of USDC received (e.g., 35000000000 / 10^6 = 35000 USDC)
  "estimatedGas": "200000", // Estimated gas for the transaction
  "protocols": [ /* ... array of protocols used in routing ... */ ],
  "tx": { /* ... transaction object for swap (see next section) ... */ }
}
```

**Notes:**

*   The `toTokenAmount` is the amount of the destination token you expect to receive, in its smallest unit. You'll need to divide this by `10^decimals` of the `toToken` to get the human-readable amount.
*   The `tx` object in the quote response is the same as what you'd get from the `/swap` endpoint, allowing you to directly use it for transaction submission.

### 1.2. Get Swap Transaction Data

**Purpose:** Generates the raw transaction data (calldata) required to execute a swap on the blockchain. This data is then signed by the user's wallet and sent as an on-chain transaction.

**Method:** `GET`

**Endpoint:** `/{chain_id}/swap`

**Parameters:**

*   `src` (string, required): Same as `src` in `quote`.
*   `dst` (string, required): Same as `dst` in `quote`.
*   `amount` (string, required): Same as `amount` in `quote`.
*   `from` (string, required): The address of the wallet that will perform the swap. This is crucial as it determines the `from` field in the transaction and is used for allowance checks.
*   `slippage` (number, required): The maximum acceptable slippage percentage (e.g., `0.5` for 0.5%). This parameter is mandatory for the `/swap` endpoint to protect users from significant price movements.
*   `referrerAddress` (string, optional): Address of the referrer for referral fees.
*   `fee` (number, optional): Same as `fee` in `quote`.
*   `gasLimit` (number, optional): Same as `gasLimit` in `quote`.
*   `gasPrice` (string, optional): Same as `gasPrice` in `quote`.
*   `protocols` (string, optional): Same as `protocols` in `quote`.
*   `destReceiver` (string, optional): Same as `destReceiver` in `quote`.
*   `burnChi` (boolean, optional): Same as `burnChi` in `quote`.
*   `allowUtxo` (boolean, optional): Same as `allowUtxo` in `quote`.
*   `parts` (number, optional): Same as `parts` in `quote`.
*   `mainRouteParts` (number, optional): Same as `mainRouteParts` in `quote`.
*   `maxTokens` (number, optional): Same as `maxTokens` in `quote`.

**Example Request (using `axios` via proxy):**

```typescript
// services/classicSwapService.ts (excerpt)
export const ClassicSwapService = {
  getSwapTransaction: async (
    chainId: ChainId,
    srcTokenAddress: string,
    dstTokenAddress: string,
    amount: string,
    fromAddress: `0x${string}`,
    slippage: number
  ): Promise<any> => {
    try {
      const resolvedSrc = resolveTokenAddress(srcTokenAddress);
      const resolvedDst = resolveTokenAddress(dstTokenAddress);

      const response = await apiClient.get(`swap/v6.1/${chainId}/swap`, {
        params: {
          src: resolvedSrc,
          dst: resolvedDst,
          amount,
          from: fromAddress,
          slippage,
        },
      });
      return response.data.tx;
    } catch (error: any) {
      console.error("Error fetching classic swap transaction:", error.response?.data || error.message);
      throw error;
    }
  },
};

// Example usage:
// const swapTx = await ClassicSwapService.getSwapTransaction(
//   "8453", // Base Chain ID
//   "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913", // Selling USDC on Base
//   ETH_NATIVE_IDENTIFIER, // Buying native ETH
//   "35000000000", // 35000 USDC
//   "0xYourWalletAddress",
//   0.5 // 0.5% slippage
// );
// console.log(swapTx);
// // Then send this transaction using your wallet provider (e.g., Viem, Ethers.js)
// const hash = await walletClient.sendTransaction(swapTx);
```

**Example Response (simplified):**

```json
{
  "from": "0xYourWalletAddress",
  "to": "0x11111112542D85B3EF69AE05771c2dCcFd3dC323", // 1inch Router address
  "data": "0x...", // Calldata for the swap transaction
  "value": "0", // Amount of native token to send (e.g., if selling ETH, this would be the ETH amount in Wei)
  "gasPrice": "1000000000", // Current gas price
  "gas": "200000" // Estimated gas limit
}
```

**Notes:**

*   The `to` address in the response is the 1inch Router contract address, which is the entry point for all swaps.
*   The `data` field contains the encoded function call for the swap. You don't need to decode this; just send it as part of the transaction.
*   The `value` field is crucial for native token swaps. If you are selling ETH, this field will contain the amount of ETH to be sent with the transaction. If you are selling an ERC-20 token, `value` will be `0`.

### 1.3. Get Allowance

**Purpose:** Checks the amount of a specific ERC-20 token that the 1inch Router is currently allowed to spend on behalf of a user's wallet. Before performing a swap of an ERC-20 token, the 1inch Router needs approval to spend that token from the user's wallet.

**Method:** `GET`

**Endpoint:** `/{chain_id}/approve/allowance`

**Parameters:**

*   `tokenAddress` (string, required): The address of the ERC-20 token you want to check the allowance for.
*   `walletAddress` (string, required): The address of the user's wallet.

**Example Request (using `axios` via proxy):**

```typescript
// services/classicSwapService.ts (excerpt)
export const ClassicSwapService = {
  getAllowance: async (
    chainId: ChainId,
    tokenAddress: `0x${string}`,
    walletAddress: `0x${string}`
  ): Promise<string> => {
    if (tokenAddress === NATIVE_TOKEN_ADDRESS) return "0"; // Native token doesn't need allowance
    try {
      const response = await apiClient.get(`swap/v6.1/${chainId}/approve/allowance`, {
        params: {
          tokenAddress,
          walletAddress,
        },
      });
      return response.data.allowance;
    } catch (error: any) {
      console.error("Error fetching allowance:", error.response?.data || error.message);
      throw error;
    }
  },
};

// Example usage:
// const usdcAllowance = await ClassicSwapService.getAllowance(
//   "8453", // Base Chain ID
//   "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913", // USDC on Base
//   "0xYourWalletAddress"
// );
// console.log("USDC Allowance:", usdcAllowance);
```

**Example Response:**

```json
{
  "allowance": "100000000000000000000000000" // Amount of token allowed (in smallest unit)
}
```

**Notes:**

*   If the `allowance` is less than the `amount` you intend to swap, you will need to prompt the user to approve the 1inch Router to spend more of their tokens.
*   For native tokens (like ETH), allowance is not required, so you should handle this case by returning `0` or skipping the check.

### 1.4. Get Approve Transaction Data

**Purpose:** Generates the transaction data (calldata) for an ERC-20 `approve` call, allowing the 1inch Router to spend a specified amount of a user's token. This is a prerequisite for swapping ERC-20 tokens.

**Method:** `GET`

**Endpoint:** `/{chain_id}/approve/calldata`

**Parameters:**

*   `tokenAddress` (string, required): The address of the ERC-20 token to approve.
*   `amount` (string, optional): The amount to approve in the token's smallest unit. If not provided, it will generate calldata for an infinite approval (a very large number). For rebalancing, it's often convenient to approve a sufficiently large amount to avoid repeated approvals.

**Example Request (using `axios` via proxy):**

```typescript
// services/classicSwapService.ts (excerpt)
export const ClassicSwapService = {
  getApproveTransactionData: async (
    chainId: ChainId,
    tokenAddress: `0x${string}`,
    amount?: string // Optional: for specific approval amount
  ): Promise<any> => {
    try {
      const params: { tokenAddress: string; amount?: string } = { tokenAddress };
      if (amount) {
        params.amount = amount;
      }
      const response = await apiClient.get(`swap/v6.1/${chainId}/approve/calldata`, {
        params,
      });
      return response.data;
    } catch (error: any) {
      console.error("Error fetching approve transaction data:", error.response?.data || error.message);
      throw error;
    }
  },
};

// Example usage for infinite approval:
// const approveTxData = await ClassicSwapService.getApproveTransactionData(
//   "8453", // Base Chain ID
//   "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913" // USDC on Base
// );
// console.log("Approve Transaction Data:", approveTxData);
// // Then send this transaction using your wallet provider (e.g., Viem, Ethers.js)
// const hash = await walletClient.sendTransaction({
//   to: approveTxData.to,
//   data: approveTxData.data,
//   gasPrice: approveTxData.gasPrice,
//   gas: approveTxData.gas,
// });
```

**Example Response:**

```json
{
  "data": "0x095ea7b300000000000000000000000011111112542d85b3ef69ae05771c2dccfd3dc3230000000000000000000000000000000000000000000000000000000000000000",
  "gasPrice": "1000000000",
  "to": "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913", // Token address
  "value": "0"
}
```

**Notes:**

*   The `to` address in this response is the token contract address, not the 1inch Router. The `data` field contains the calldata for the `approve` function call on the ERC-20 token contract.
*   Users must sign and send this transaction to the blockchain for the approval to take effect.

### 1.5. Get Spender Address

**Purpose:** Retrieves the address of the 1inch Router contract that needs to be approved to spend tokens. This is the `spender` address in ERC-20 `approve` calls.

**Method:** `GET`

**Endpoint:** `/{chain_id}/approve/spender`

**Parameters:** None.

**Example Request (using `axios` via proxy):**

```typescript
// services/classicSwapService.ts (excerpt)
export const ClassicSwapService = {
  getSpenderAddress: async (chainId: ChainId): Promise<string> => {
    try {
      const response = await apiClient.get(`swap/v6.1/${chainId}/approve/spender`);
      return response.data.address;
    } catch (error: any) {
      console.error("Error fetching spender address:", error.response?.data || error.message);
      throw error;
    }
  },
};

// Example usage:
// const spender = await ClassicSwapService.getSpenderAddress("8453"); // Base Chain ID
// console.log("1inch Spender Address:", spender);
```

**Example Response:**

```json
{
  "address": "0x11111112542D85B3EF69AE05771c2dCcFd3dC323" // 1inch Router address
}
```

**Notes:**

*   This address is constant for a given chain and represents the 1inch Router contract that will interact with approved tokens.

## 2. 1inch Fusion+ Cross-Chain Swap API (SDK Recommended)

### Overview

Fusion+ enables seamless, intent-based atomic cross-chain swaps. Unlike Classic Swap which aggregates liquidity on a single chain, Fusion+ allows users to swap tokens between different blockchains in a single, atomic transaction. This is achieved through a network of 




### 2.1. Fusion+ SDK Overview and Installation

For interacting with 1inch Fusion+, especially for complex cross-chain swap flows involving secrets and order management, it is **highly recommended** to use the official `@1inch/cross-chain-sdk`. This SDK abstracts away much of the complexity of direct API calls and handles the intricate multi-step processes required for Fusion+.

**Installation:**

To install the SDK in your React/Next.js project, use npm or yarn:

```bash
npm install @1inch/cross-chain-sdk web3
# or
yarn add @1inch/cross-chain-sdk web3
```

Note: `web3` is required by the SDK for certain functionalities, particularly for `PrivateKeyProviderConnector` if you were to use a private key directly. In a client-side React app, you'll typically use a wallet provider (like Viem's `WalletClient` or Ethers.js `JsonRpcSigner`) to sign transactions, which the SDK can integrate with.

### 2.2. SDK Setup

To initialize the 1inch Fusion+ SDK, you need an `authKey` (your 1inch API key) and a `blockchainProvider`. For a client-side React application, you will typically integrate with the user's connected wallet (e.g., via Viem or Ethers.js) to provide the necessary signing capabilities.

Here's how you might set up the SDK in a React context, assuming you're using Viem for wallet interactions:

```typescript
// utils/fusionPlusSdk.ts
import { SDK, NetworkEnum } from '@1inch/cross-chain-sdk';
import { PublicClient, WalletClient, Chain, Account } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

// Custom provider connector for Viem WalletClient
// This allows the 1inch SDK to use your Viem WalletClient for signing
class ViemWalletClientProviderConnector {
  private walletClient: WalletClient;
  private publicClient: PublicClient;

  constructor(walletClient: WalletClient, publicClient: PublicClient) {
    this.walletClient = walletClient;
    this.publicClient = publicClient;
  }

  async signMessage(message: string): Promise<string> {
    if (!this.walletClient.account) {
      throw new Error('WalletClient account not found. Please connect wallet.');
    }
    return this.walletClient.signMessage({
      account: this.walletClient.account,
      message: message,
    });
  }

  async signTypedData(data: any): Promise<string> {
    if (!this.walletClient.account) {
      throw new Error('WalletClient account not found. Please connect wallet.');
    }
    // Viem's signTypedData expects a specific format. You might need to adapt 'data' here.
    // For simplicity, this example assumes 'data' is compatible or can be converted.
    return this.walletClient.signTypedData({
      account: this.walletClient.account,
      domain: data.domain,
      types: data.types,
      primaryType: data.primaryType,
      message: data.message,
    });
  }

  async sendTransaction(tx: any): Promise<string> {
    if (!this.walletClient.account) {
      throw new Error('WalletClient account not found. Please connect wallet.');
    }
    const hash = await this.walletClient.sendTransaction({
      account: this.walletClient.account,
      to: tx.to,
      data: tx.data,
      value: BigInt(tx.value || 0),
      gas: BigInt(tx.gasLimit || tx.gas || 0), // Use gasLimit if available, fallback to gas
      gasPrice: BigInt(tx.gasPrice || 0),
      // chainId: this.walletClient.chain.id, // Viem handles chainId automatically
    });
    return hash;
  }

  async getChainId(): Promise<number> {
    return this.walletClient.chain.id;
  }

  async getWalletAddress(): Promise<string> {
    if (!this.walletClient.account) {
      throw new Error('WalletClient account not found. Please connect wallet.');
    }
    return this.walletClient.account.address;
  }

  async getBalance(address: string): Promise<string> {
    const balance = await this.publicClient.getBalance({
      address: address as `0x${string}`,
    });
    return balance.toString();
  }
}

// Function to get the SDK instance
export const getFusionPlusSDK = (walletClient: WalletClient, publicClient: PublicClient, authKey: string) => {
  if (!walletClient || !publicClient || !authKey) {
    throw new Error('WalletClient, PublicClient, and authKey are required to initialize Fusion+ SDK.');
  }
  const blockchainProvider = new ViemWalletClientProviderConnector(walletClient, publicClient);

  return new SDK({
    url: 'https://api.1inch.dev/fusion-plus', // Fusion+ API base URL
    authKey: authKey,
    blockchainProvider: blockchainProvider,
    // source: 'your-dapp-name', // Optional: identify your dApp
  });
};

// Example usage in a React hook (e.g., useFusionPlusSDK.ts)
// import { usePublicClient, useWalletClient } from 'wagmi'; // Assuming wagmi for wallet connection
// import { getFusionPlusSDK } from '../utils/fusionPlusSdk';
// import { useMemo } from 'react';

// export const useFusionPlusSDK = () => {
//   const { data: walletClient } = useWalletClient();
//   const publicClient = usePublicClient();
//   const authKey = process.env.NEXT_PUBLIC_1INCH_API_KEY; // Securely load your API key

//   const sdk = useMemo(() => {
//     if (!walletClient || !publicClient || !authKey) return null;
//     return getFusionPlusSDK(walletClient, publicClient, authKey);
//   }, [walletClient, publicClient, authKey]);

//   return sdk;
// };
```

### 2.3. Fusion+ Cross-Chain Swap Workflow with SDK

The Fusion+ cross-chain swap process is more involved than a single-chain swap due to its intent-based nature and the requirement for secret management. The SDK simplifies this by providing methods that encapsulate these complexities. The general flow involves getting a quote, creating an order, submitting the order, and then actively participating in secret submission.

#### 2.3.1. Get Quote (`sdk.getQuote`)

**Purpose:** Obtain an estimated quote for a cross-chain swap. This includes the `quoteId`, `presets` (different speed/cost options), and other details necessary for creating the order.

**Method:** SDK Call

**SDK Method:** `sdk.getQuote(params)`

**Parameters:**

*   `amount` (string, required): The amount of the source token to sell, in its smallest unit.
*   `srcChainId` (NetworkEnum, required): The chain ID of the source token.
*   `dstChainId` (NetworkEnum, required): The chain ID of the destination token.
*   `srcTokenAddress` (string, required): The address of the source token.
*   `dstTokenAddress` (string, required): The address of the destination token.
*   `walletAddress` (string, required): The address of the user's wallet.
*   `enableEstimate` (boolean, optional): If `true`, the quote will include an estimate of the gas cost. Defaults to `true`.

**Example Usage:**

```typescript
import { NetworkEnum } from '@1inch/cross-chain-sdk';
// ... assuming sdk is initialized as shown in 2.2

const srcTokenAddress = '0xc2132d05d31c914a87c6611c10748aeb04b58e8f'; // USDT on Polygon
const dstTokenAddress = '0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee'; // BNB on BSC
const amount = '10000000'; // 10 USDT (assuming 6 decimals)
const walletAddress = '0xYourWalletAddress';

const quote = await sdk.getQuote({
  amount,
  srcChainId: NetworkEnum.POLYGON,
  dstChainId: NetworkEnum.BINANCE,
  srcTokenAddress,
  dstTokenAddress,
  walletAddress,
  enableEstimate: true,
});

console.log('Fusion+ Quote:', quote);
// Example quote structure:
// {
//   quoteId: '...', // Unique ID for this quote
//   presets: {
//     fast: { secretsCount: 1, /* ... other details ... */ },
//     medium: { secretsCount: 1, /* ... other details ... */ },
//     // ... other presets
//   },
//   srcToken: { /* ... token info ... */ },
//   dstToken: { /* ... token info ... */ },
//   srcTokenAmount: '...', // Amount of source token
//   dstTokenAmount: '...', // Estimated amount of destination token
//   // ... other quote details
// }
```

#### 2.3.2. Secret Generation

Fusion+ swaps rely on a cryptographic primitive called a Hash Time-Locked Contract (HTLC) or similar mechanisms, which require 


secrets to ensure atomic swaps. You need to generate these secrets before creating an order.

**Method:** Local Generation

**Example Usage:**

```typescript
import { HashLock, PresetEnum } from '@1inch/cross-chain-sdk';
import { randomBytes } from 'node:crypto'; // For Node.js environment
// In a browser environment, you might use window.crypto.getRandomValues or a library like 'ethers.js' for secure random number generation

// Assuming 'quote' is obtained from sdk.getQuote and 'preset' is chosen (e.g., PresetEnum.fast)
const preset = PresetEnum.fast; // Or chosen by user based on quote.presets

// Generate secrets based on the chosen preset's secretsCount
const secrets = Array.from({
  length: quote.presets[preset].secretsCount,
}).map(() => '0x' + randomBytes(32).toString('hex'));

// Create a hashLock from the secrets. This is used to link the order to the secrets.
const hashLock = 
  secrets.length === 1
    ? HashLock.forSingleFill(secrets[0])
    : HashLock.forMultipleFills(HashLock.getMerkleLeaves(secrets));

// Generate secret hashes. These are sent with the order to the 1inch API.
const secretHashes = secrets.map((s) => HashLock.hashSecret(s));

console.log('Secrets:', secrets);
console.log('HashLock:', hashLock);
console.log('Secret Hashes:', secretHashes);
```

**Notes:**

*   `randomBytes` is a Node.js specific function. For browser environments, ensure you use a secure random number generator (e.g., `window.crypto.getRandomValues` or a crypto library).
*   The `secretsCount` varies by `preset` and determines how many individual secrets are needed for the swap to complete.
*   `HashLock.forSingleFill` is used for swaps that complete in one go, while `HashLock.forMultipleFills` is for multi-part swaps.

#### 2.3.3. Create Order (`sdk.createOrder`)

**Purpose:** Creates the Fusion+ order object, which encapsulates the swap intent and the cryptographic commitments (hash locks) to the secrets. This order is then ready to be submitted to the 1inch Fusion+ network.

**Method:** SDK Call

**SDK Method:** `sdk.createOrder(quote, params)`

**Parameters:**

*   `quote` (object, required): The quote object obtained from `sdk.getQuote`.
*   `params` (object, required):
    *   `walletAddress` (string, required): The address of the user's wallet.
    *   `hashLock` (string, required): The hash lock generated in the previous step.
    *   `preset` (PresetEnum, required): The chosen preset (e.g., `PresetEnum.fast`).
    *   `source` (string, optional): An identifier for your dApp (e.g., `sdk-tutorial` or `your-dapp-name`).
    *   `secretHashes` (string[], required): An array of secret hashes generated in the previous step.

**Example Usage:**

```typescript
// ... assuming sdk, quote, hashLock, secretHashes, and walletAddress are available

const source = 'my-rebalancing-dapp'; // Identify your dApp

const { hash, quoteId, order } = await sdk.createOrder(quote, {
  walletAddress,
  hashLock,
  preset,
  source,
  secretHashes,
});

console.log('Fusion+ Order Created:', { hash, quoteId, order });
// 'hash' is the unique identifier for this order
// 'order' is the signed order object that will be submitted
```

**Notes:**

*   The `order` object returned contains the signed intent that resolvers on the 1inch Fusion+ network will fulfill.
*   The `hash` is a crucial identifier for tracking the status of your order.

#### 2.3.4. Submit Order (`sdk.submitOrder`)

**Purpose:** Submits the created Fusion+ order to the 1inch Fusion+ network. This makes the order visible to resolvers who can then pick it up and execute the swap.

**Method:** SDK Call

**SDK Method:** `sdk.submitOrder(srcChainId, order, quoteId, secretHashes)`

**Parameters:**

*   `srcChainId` (NetworkEnum, required): The chain ID of the source token.
*   `order` (object, required): The order object obtained from `sdk.createOrder`.
*   `quoteId` (string, required): The `quoteId` obtained from `sdk.getQuote`.
*   `secretHashes` (string[], required): The array of secret hashes generated earlier.

**Example Usage:**

```typescript
// ... assuming sdk, quote, order, quoteId, and secretHashes are available

const _orderInfo = await sdk.submitOrder(
  quote.srcChainId,
  order,
  quoteId,
  secretHashes
);

console.log('Fusion+ Order Submitted. Order Hash:', hash); // 'hash' from createOrder
```

**Notes:**

*   This step typically doesn't require a blockchain transaction from the user's wallet; it's an off-chain submission to the 1inch Fusion+ network.

#### 2.3.5. Secret Submission Loop (`sdk.getReadyToAcceptSecretFills`, `sdk.submitSecret`, `sdk.getOrderStatus`)

**Purpose:** After an order is submitted, resolvers on the Fusion+ network will begin to fulfill it. This process involves deploying escrows on the source and destination chains. As these escrows are deployed, your dApp needs to actively submit the corresponding secrets to allow the resolvers to complete the swap. This is an asynchronous, polling-based process.

**Method:** SDK Calls (Polling)

**SDK Methods:**

*   `sdk.getReadyToAcceptSecretFills(orderHash)`: Checks if there are any secrets that need to be submitted for a given order.
*   `sdk.submitSecret(orderHash, secret)`: Submits a specific secret for an order.
*   `sdk.getOrderStatus(orderHash)`: Retrieves the current status of the order.

**Example Usage (simplified loop):**

```typescript
import { OrderStatus } from '@1inch/cross-chain-sdk';
// ... assuming sdk and hash (order hash) are available

async function waitForFusionPlusCompletion(sdk: any, orderHash: string, secrets: string[]) {
  while (true) {
    const secretsToShare = await sdk.getReadyToAcceptSecretFills(orderHash);

    if (secretsToShare.fills.length) {
      for (const { idx } of secretsToShare.fills) {
        // Ensure the secret exists at the given index
        if (secrets[idx]) {
          await sdk.submitSecret(orderHash, secrets[idx]);
          console.log(`Secret ${idx} shared for order ${orderHash}`);
        } else {
          console.warn(`Secret at index ${idx} not found for order ${orderHash}`);
        }
      }
    }

    // Check if order finished
    const { status } = await sdk.getOrderStatus(orderHash);

    if (
      status === OrderStatus.Executed ||
      status === OrderStatus.Expired ||
      status === OrderStatus.Refunded
    ) {
      console.log(`Fusion+ Order ${orderHash} finished with status: ${status}`);
      break;
    }

    await new Promise(resolve => setTimeout(resolve, 5000)); // Poll every 5 seconds
  }
  return sdk.getOrderStatus(orderHash); // Return final status
}

// Example call:
// const finalStatus = await waitForFusionPlusCompletion(sdk, hash, secrets);
// console.log('Final Fusion+ Status:', finalStatus);
```

**Notes:**

*   This loop is critical for the successful completion of Fusion+ swaps. Your dApp needs to keep running this process until the order reaches a final state (`Executed`, `Expired`, or `Refunded`).
*   The polling interval should be reasonable (e.g., 5-10 seconds) to avoid excessive API calls while ensuring timely secret submission.
*   Error handling within this loop is crucial for production applications.

### 2.4. When to Use Fusion+ SDK vs. Classic Swap API

**Classic Swap API (REST API):**

*   **Use Case:** Single-chain swaps where you need to exchange tokens on the *same* blockchain. This is ideal for rebalancing within a single chain (e.g., swapping ETH for USDC on Base).
*   **Simplicity:** Simpler integration, as it primarily involves `getQuote`, `getSwapTransaction`, and `approve` calls, which are direct REST API interactions.
*   **Control:** You have direct control over the transaction parameters and submission.

**Fusion+ SDK:**

*   **Use Case:** Cross-chain swaps where you need to exchange tokens between *different* blockchains (e.g., swapping USDT on Polygon for BNB on BSC). This is essential for your cross-chain portfolio rebalancing.
*   **Complexity Abstraction:** The SDK handles the complex multi-step process of Fusion+ (secret generation, order creation, submission, and secret revelation) which would be very difficult to manage with raw REST API calls.
*   **Intent-Based:** Leverages 1inch's intent-based architecture for atomic cross-chain swaps, providing a more robust and secure solution for inter-chain value transfer.
*   **Recommendation:** For any cross-chain functionality, **always use the Fusion+ SDK**. It is designed to manage the intricacies of the Fusion+ protocol and will save you significant development time and reduce potential errors.

**For your portfolio rebalancing app:**

*   **Single-Chain Rebalancing:** Use the **Classic Swap API** for rebalancing operations that occur entirely within one blockchain (e.g., rebalancing assets on Base).
*   **Cross-Chain Rebalancing:** Use the **Fusion+ SDK** for rebalancing operations that involve moving assets between different blockchains (e.g., moving assets from Base to Polygon).

## 3. 1inch Balance API

**Purpose:** Retrieves the token balances for a given wallet address on a specific blockchain. This is essential for displaying a user's portfolio in your dApp.

**Base URL:** `https://api.1inch.dev/balance/v1.2/{chain_id}`

### 3.1. Get Wallet Balances

**Method:** `GET`

**Endpoint:** `/{chain_id}/balances`

**Parameters:**

*   `addresses` (string, required): Comma-separated list of wallet addresses for which to retrieve balances.
*   `tokens` (string, optional): Comma-separated list of token addresses to filter the results. If not provided, balances for all known tokens will be returned.

**Example Request (using `axios` via proxy):**

```typescript
// services/balanceService.ts
import apiClient from "../utils/apiClient";
import { ChainId } from "../config/chains";

export const BalanceService = {
  getBalances: async (
    chainId: ChainId,
    walletAddress: string,
    tokenAddresses?: string[]
  ): Promise<any> => {
    try {
      const params: { addresses: string; tokens?: string } = {
        addresses: walletAddress,
      };
      if (tokenAddresses && tokenAddresses.length > 0) {
        params.tokens = tokenAddresses.join(",");
      }
      const response = await apiClient.get(`balance/v1.2/${chainId}/balances`, {
        params,
      });
      return response.data;
    } catch (error: any) {
      console.error("Error fetching balances:", error.response?.data || error.message);
      throw error;
    }
  },
};

// Example usage:
// const walletAddress = "0xYourWalletAddress";
// const baseBalances = await BalanceService.getBalances(
//   "8453", // Base Chain ID
//   walletAddress,
//   ["0x833589fcd6edb6e08f4c7c32d4f71b54bda02913", "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"] // USDC and ETH
// );
// console.log("Base Balances:", baseBalances);
```

**Example Response (simplified):**

```json
{
  "0xYourWalletAddress": {
    "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913": {
      "tokenAddress": "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
      "symbol": "USDC",
      "decimals": 6,
      "balance": "1000000000" // 1000 USDC
    },
    "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee": {
      "tokenAddress": "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
      "symbol": "ETH",
      "decimals": 18,
      "balance": "500000000000000000" // 0.5 ETH
    }
  }
}
```

**Notes:**

*   The response is an object where keys are wallet addresses and values are objects containing token balances.
*   Balances are returned in the token's smallest unit (e.g., Wei for ETH, or `10^decimals` for ERC-20 tokens).

## 4. 1inch Price Feeds API

**Purpose:** Provides real-time price information for various tokens. This is crucial for calculating the USD value of a user's portfolio and for determining rebalancing needs.

**Base URL:** `https://api.1inch.dev/price/v1.1/{chain_id}`

### 4.1. Get Token Price

**Method:** `GET`

**Endpoint:** `/{chain_id}/token/{token_address}`

**Parameters:**

*   `token_address` (string, required): The address of the token for which to retrieve the price.
*   `currency` (string, optional): The currency to quote the price in (e.g., `USD`, `ETH`). Defaults to `USD`.

**Example Request (using `axios` via proxy):**

```typescript
// services/priceService.ts
import apiClient from "../utils/apiClient";
import { ChainId } from "../config/chains";

export const PriceService = {
  getTokenPrice: async (
    chainId: ChainId,
    tokenAddress: string,
    currency: string = "USD"
  ): Promise<any> => {
    try {
      const response = await apiClient.get(`price/v1.1/${chainId}/token/${tokenAddress}`, {
        params: {
          currency,
        },
      });
      return response.data;
    } catch (error: any) {
      console.error("Error fetching token price:", error.response?.data || error.message);
      throw error;
    }
  },
};

// Example usage:
// const usdcPrice = await PriceService.getTokenPrice(
//   "8453", // Base Chain ID
//   "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913", // USDC on Base
//   "USD"
// );
// console.log("USDC Price:", usdcPrice);
```

**Example Response (simplified):**

```json
{
  "value": "1.000000000000000000", // Price of 1 token in the specified currency
  "decimals": 18 // Decimals of the price value
}
```

**Notes:**

*   The `value` is returned as a string representing the price, and `decimals` indicates its precision. You'll need to divide `value` by `10^decimals` to get the human-readable price.

## 5. 1inch Token Metadata API

**Purpose:** Provides detailed metadata for various tokens, including their symbols, names, decimals, and images. This is useful for displaying token information in your dApp's UI.

**Base URL:** `https://api.1inch.dev/token/v1.2/{chain_id}`

### 5.1. Get Token List

**Method:** `GET`

**Endpoint:** `/{chain_id}/token`

**Parameters:** None.

**Example Request (using `axios` via proxy):**

```typescript
// services/tokenService.ts
import apiClient from "../utils/apiClient";
import { ChainId } from "../config/chains";

export const TokenService = {
  getTokenList: async (chainId: ChainId): Promise<any> => {
    try {
      const response = await apiClient.get(`token/v1.2/${chainId}/token`);
      return response.data;
    } catch (error: any) {
      console.error("Error fetching token list:", error.response?.data || error.message);
      throw error;
    }
  },
};

// Example usage:
// const baseTokens = await TokenService.getTokenList("8453"); // Base Chain ID
// console.log("Base Tokens:", baseTokens);
```

**Example Response (simplified):**

```json
{
  "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913": {
    "symbol": "USDC",
    "name": "USD Coin",
    "address": "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913",
    "decimals": 6,
    "logoURI": "https://tokens.1inch.io/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.png"
  },
  "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee": {
    "symbol": "ETH",
    "name": "Ethereum",
    "address": "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
    "decimals": 18,
    "logoURI": "https://tokens.1inch.io/0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee.png"
  }
  // ... more tokens
}
```

**Notes:**

*   The response is an object where keys are token addresses and values are their metadata.

## 6. 1inch Web3 RPC API

**Purpose:** Provides a way to interact with the blockchain directly through 1inch's infrastructure. This can be used for sending raw transactions, calling smart contract methods, or querying blockchain state. While you might use a direct RPC provider (like Alchemy) for most of your blockchain interactions, the 1inch Web3 RPC can serve as a fallback or for specific 1inch-related calls.

**Base URL:** `https://api.1inch.dev/rpc/{chain_id}`

### 6.1. Send Raw Transaction

**Method:** `POST`

**Endpoint:** `/{chain_id}`

**Parameters (JSON RPC format):**

*   `jsonrpc` (string, required): 


"2.0"`
*   `method` (string, required): The RPC method to call (e.g., `eth_sendRawTransaction`, `eth_call`).
*   `params` (array, required): An array of parameters for the RPC method.
*   `id` (number, required): A unique request ID.

**Example Request (sending a raw transaction):**

```typescript
// services/web3RpcService.ts
import apiClient from "../utils/apiClient";
import { ChainId } from "../config/chains";

export const Web3RpcService = {
  sendRawTransaction: async (
    chainId: ChainId,
    signedTransaction: string
  ): Promise<any> => {
    try {
      const response = await apiClient.post(`rpc/${chainId}`, {
        jsonrpc: "2.0",
        method: "eth_sendRawTransaction",
        params: [signedTransaction],
        id: 1,
      });
      return response.data.result;
    } catch (error: any) {
      console.error("Error sending raw transaction via Web3 RPC:", error.response?.data || error.message);
      throw error;
    }
  },

  // Example for eth_call (reading data from a smart contract)
  callContract: async (
    chainId: ChainId,
    to: string,
    data: string,
    block: string = "latest"
  ): Promise<any> => {
    try {
      const response = await apiClient.post(`rpc/${chainId}`, {
        jsonrpc: "2.0",
        method: "eth_call",
        params: [{
          to,
          data,
        }, block],
        id: 1,
      });
      return response.data.result;
    } catch (error: any) {
      console.error("Error calling contract via Web3 RPC:", error.response?.data || error.message);
      throw error;
    }
  },
};

// Example usage for sending a signed transaction (e.g., from Classic Swap API):
// const signedTx = "0x..."; // This would come from your wallet signing the tx.data from 1inch swap API
// const txHash = await Web3RpcService.sendRawTransaction("8453", signedTx);
// console.log("Transaction Hash:", txHash);

// Example usage for calling a contract (e.g., getting ERC-20 symbol)
// const tokenAddress = "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913"; // USDC on Base
// const symbolCalldata = "0x95d89b41"; // ERC-20 symbol() method selector
// const symbolEncoded = await Web3RpcService.callContract("8453", tokenAddress, symbolCalldata);
// console.log("Encoded Symbol:", symbolEncoded); // You'd need to decode this (e.g., using Viem/Ethers.js)
```

**Example Response (for `eth_sendRawTransaction`):**

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": "0xTransactionHash"
}
```

**Example Response (for `eth_call`):**

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": "0x000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000045553444300000000000000000000000000000000000000000000000000000000" // Encoded string for 


USDC
}
```

**Notes:**

*   This API is a generic JSON-RPC endpoint. You can use it to send any standard Ethereum JSON-RPC request.
*   For most dApp interactions, especially transaction signing and sending, it's generally recommended to use a dedicated library like Viem or Ethers.js with a direct RPC provider (e.g., Alchemy's RPC endpoints) as they offer more robust features and better integration with wallet providers. The 1inch Web3 RPC can be a useful alternative or for specific read-only queries.

## 7. 1inch Limit Order API

**Purpose:** Allows users to place limit orders, which are orders to buy or sell a token at a specified price or better. Unlike market orders (which Classic Swap handles), limit orders are not executed immediately but wait for the market to reach the desired price. This can be useful for advanced rebalancing strategies where you want to execute swaps only when certain price conditions are met.

**Base URL:** `https://api.1inch.dev/limit-order/v3.0/{chain_id}`

### 7.1. Get Order Status

**Method:** `GET`

**Endpoint:** `/{chain_id}/limit-order/status/{orderHash}`

**Parameters:**

*   `orderHash` (string, required): The hash of the limit order to check.

**Example Request (using `axios` via proxy):**

```typescript
// services/limitOrderService.ts
import apiClient from "../utils/apiClient";
import { ChainId } from "../config/chains";

export const LimitOrderService = {
  getOrderStatus: async (
    chainId: ChainId,
    orderHash: string
  ): Promise<any> => {
    try {
      const response = await apiClient.get(`limit-order/v3.0/${chainId}/limit-order/status/${orderHash}`);
      return response.data;
    } catch (error: any) {
      console.error("Error fetching limit order status:", error.response?.data || error.message);
      throw error;
    }
  },
};

// Example usage:
// const orderStatus = await LimitOrderService.getOrderStatus("8453", "0xYourOrderHash");
// console.log("Limit Order Status:", orderStatus);
```

**Example Response (simplified):**

```json
{
  "orderHash": "0xYourOrderHash",
  "status": "active", // e.g., "active", "filled", "cancelled", "expired"
  "filledAmount": "0",
  "remainingAmount": "1000000000000000000",
  "createDateTime": "2025-07-26T12:00:00Z",
  "maker": "0xYourWalletAddress",
  "taker": "0x0000000000000000000000000000000000000000", // Can be specific taker or zero address for anyone
  "data": { /* ... order data ... */ }
}
```

**Notes:**

*   The `status` field indicates the current state of the limit order.

### 7.2. Get Orders by Address

**Method:** `GET`

**Endpoint:** `/{chain_id}/limit-order/address/{address}`

**Parameters:**

*   `address` (string, required): The address of the maker (creator) of the limit orders.
*   `page` (number, optional): Page number for pagination. Defaults to `1`.
*   `limit` (number, optional): Number of orders per page. Defaults to `50`.

**Example Request (using `axios` via proxy):**

```typescript
// services/limitOrderService.ts
export const LimitOrderService = {
  getOrdersByAddress: async (
    chainId: ChainId,
    makerAddress: string,
    page: number = 1,
    limit: number = 50
  ): Promise<any> => {
    try {
      const response = await apiClient.get(`limit-order/v3.0/${chainId}/limit-order/address/${makerAddress}`, {
        params: {
          page,
          limit,
        },
      });
      return response.data;
    } catch (error: any) {
      console.error("Error fetching limit orders by address:", error.response?.data || error.message);
      throw error;
    }
  },
};

// Example usage:
// const myOrders = await LimitOrderService.getOrdersByAddress("8453", "0xYourWalletAddress");
// console.log("My Limit Orders:", myOrders);
```

**Example Response (simplified):**

```json
[
  { /* ... order 1 details ... */ },
  { /* ... order 2 details ... */ }
]
```

**Notes:**

*   Returns an array of limit order objects created by the specified address.

### 7.3. Create Limit Order

**Purpose:** Creates a new limit order. This involves constructing the order data, signing it off-chain, and then submitting it to the 1inch Limit Order Protocol API.

**Method:** `POST`

**Endpoint:** `/{chain_id}/limit-order`

**Parameters (Request Body):**

*   `order` (object, required): The signed limit order object. This object is typically generated using a client-side library (e.g., 1inch's own limit order SDK or a custom implementation) and then signed by the user's wallet.

**Example Request (Conceptual - Order generation and signing are complex and usually handled by an SDK/library):**

Creating a limit order is a multi-step process that involves:

1.  **Preparing Order Data:** Defining the `maker` (your wallet address), `taker` (optional, can be zero address for anyone), `makerAsset` (token to sell), `takerAsset` (token to buy), `makerAmount`, `takerAmount`, `salt`, `expiration`, and other parameters.
2.  **Hashing the Order:** Computing a hash of the order data.
3.  **Signing the Hash:** The `maker` (user's wallet) signs this hash off-chain using EIP-712 typed data signing. This generates a signature.
4.  **Constructing the Signed Order Object:** Combining the order data and the signature into a single object.
5.  **Submitting to API:** Sending this signed order object to the `/limit-order` endpoint.

Due to the complexity of order generation and signing, it's highly recommended to use a dedicated library or SDK if 1inch provides one for limit orders, or to follow their detailed protocol specifications. For this document, we'll focus on the API interaction assuming you have a signed order object.

```typescript
// services/limitOrderService.ts (excerpt)
export const LimitOrderService = {
  createOrder: async (
    chainId: ChainId,
    signedOrder: any // This object should contain the order data and signature
  ): Promise<any> => {
    try {
      const response = await apiClient.post(`limit-order/v3.0/${chainId}/limit-order`, signedOrder);
      return response.data;
    } catch (error: any) {
      console.error("Error creating limit order:", error.response?.data || error.message);
      throw error;
    }
  },
};

// Example usage (conceptual - assumes signedOrder is already generated and signed):
// const signedOrder = { /* ... generated and signed order object ... */ };
// const newOrder = await LimitOrderService.createOrder("8453", signedOrder);
// console.log("New Limit Order:", newOrder);
```

**Example Response (simplified):**

```json
{
  "orderHash": "0xNewlyCreatedOrderHash",
  "success": true
}
```

**Notes:**

*   Limit orders are off-chain until they are filled by a taker. The API acts as an order book.
*   Ensure the order is correctly signed by the user's wallet before submission.

## 8. Integrating Alchemy Account Abstraction for Batching Swaps

Alchemy Account Abstraction (AA) allows for advanced functionalities like sponsoring gas, social recovery, and crucially for your rebalancing app, **batching multiple transactions into a single user operation (UserOp)**. This means a user can approve multiple tokens and execute multiple swaps with just one signature, significantly improving the user experience.

Your goal is to batch multiple 1inch Classic Swap transactions (or even Fusion+ related transactions like approvals) into a single UserOp that can be sent via Alchemy's `sendUserOperation` hook.

### 8.1. Understanding User Operations and Batching

In the context of ERC-4337 (Account Abstraction), a 


User Operation (UserOp) is a structure that describes an action to be performed by a smart account. Alchemy provides SDKs (like `@account-kit/react`) that simplify the creation and sending of these UserOps. The key advantage for your rebalancing app is the ability to bundle multiple individual transactions (e.g., several `approve` calls and several `swap` calls) into a single UserOp.

Alchemy's `useSendUserOperation` hook, as seen in their React Quickstart Template, can accept either a single `UserOperationCallData` object or an array of `UserOperationCallData` objects for batching.

### 8.2. Preparing Transactions for Batching

To batch 1inch swap transactions, you first need to obtain the `calldata` for each individual transaction. For Classic Swaps, this means calling the `/{chain_id}/swap` endpoint to get the `tx.data` and `tx.to` for each swap. For ERC-20 approvals, you'd use `/{chain_id}/approve/calldata`.

**Steps to prepare transactions:**

1.  **Determine Required Swaps:** Based on the user's desired allocation and current portfolio, identify the `srcToken`, `dstToken`, and `amount` for each necessary swap.
2.  **Fetch Swap Transaction Data:** For each identified swap, call the 1inch Classic Swap API's `/{chain_id}/swap` endpoint to get the `tx` object (containing `to`, `data`, `value`).
3.  **Fetch Approval Transaction Data (if needed):** For each ERC-20 token being sold, check its allowance using `/{chain_id}/approve/allowance`. If the allowance is insufficient, call `/{chain_id}/approve/calldata` to get the `approve` transaction data.

**Example: Preparing multiple swap transactions for batching**

Let's assume you need to perform two swaps on Base: ETH to USDC, and WETH to DAI.

```typescript
// services/transactionPreparation.ts
import { ClassicSwapService } from "./classicSwapService";
import { ChainId } from "../config/chains";
import { ETH_NATIVE_IDENTIFIER, NATIVE_TOKEN_ADDRESS } from "../utils/tokenUtils";
import { UserOperationCallData } from "@account-kit/react"; // Assuming this type from Alchemy SDK

interface SwapDetails {
  srcTokenAddress: string;
  dstTokenAddress: string;
  amount: string;
  slippage: number;
}

export const prepareBatchSwapTransactions = async (
  chainId: ChainId,
  walletAddress: `0x${string}`,
  swapsToExecute: SwapDetails[]
): Promise<UserOperationCallData[]> => {
  const userOps: UserOperationCallData[] = [];

  for (const swap of swapsToExecute) {
    const { srcTokenAddress, dstTokenAddress, amount, slippage } = swap;

    // 1. Handle ERC-20 Approvals if necessary
    // For simplicity, this example assumes infinite approval or pre-approved tokens.
    // In a real app, you'd check allowance and add an approve transaction if needed.
    // Example: If srcTokenAddress is an ERC-20 and allowance is insufficient:
    // const allowance = await ClassicSwapService.getAllowance(chainId, srcTokenAddress, walletAddress);
    // if (BigInt(allowance) < BigInt(amount)) {
    //   const approveTx = await ClassicSwapService.getApproveTransactionData(chainId, srcTokenAddress);
    //   userOps.push({
    //     target: approveTx.to as `0x${string}`,
    //     data: approveTx.data as `0x${string}`,
    //     value: BigInt(approveTx.value || 0),
    //   });
    // }

    // 2. Get Swap Transaction Data
    const swapTx = await ClassicSwapService.getSwapTransaction(
      chainId,
      srcTokenAddress,
      dstTokenAddress,
      amount,
      walletAddress,
      slippage
    );

    userOps.push({
      target: swapTx.to as `0x${string}`,
      data: swapTx.data as `0x${string}`,
      value: BigInt(swapTx.value || 0),
    });
  }

  return userOps;
};

// Example usage in a component:
// const swaps = [
//   {
//     srcTokenAddress: ETH_NATIVE_IDENTIFIER, // ETH
//     dstTokenAddress: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913", // USDC
//     amount: "100000000000000000", // 0.1 ETH
//     slippage: 0.5,
//   },
//   {
//     srcTokenAddress: "0x4200000000000000000000000000000000000006", // WETH on Base
//     dstTokenAddress: "0x50c5725949a6f0c72e6ce646f69ecead429f45b5", // DAI on Base
//     amount: "500000000000000000", // 0.5 WETH
//     slippage: 0.5,
//   },
// ];
// const batchedUserOps = await prepareBatchSwapTransactions(
//   "8453", // Base Chain ID
//   "0xYourSmartAccountAddress",
//   swaps
// );
// console.log("Batched User Operations:", batchedUserOps);
```

### 8.3. Executing Batched Swaps with Alchemy SDK

Once you have an array of `UserOperationCallData` objects, you can use Alchemy's `useSendUserOperation` hook to send them as a single batched transaction.

```typescript
// components/BatchSwapExecutor.tsx
import React from "react";
import { useSendUserOperation, useSmartAccountClient } from "@account-kit/react";
import { prepareBatchSwapTransactions } from "../services/transactionPreparation";
import { ChainId } from "../config/chains";
import { ETH_NATIVE_IDENTIFIER } from "../utils/tokenUtils";

interface BatchSwapExecutorProps {
  walletAddress: `0x${string}`;
  chainId: ChainId;
}

const BatchSwapExecutor: React.FC<BatchSwapExecutorProps> = ({
  walletAddress,
  chainId,
}) => {
  const { client } = useSmartAccountClient();
  const {
    sendUserOperation,
    isSendingUserOperation,
    sendUserOperationResult,
    error,
  } = useSendUserOperation({
    client,
    waitForTxn: true, // Wait for the transaction to be mined
    onSuccess: ({ hash }) => {
      console.log("Batch swap UserOp sent! Transaction Hash:", hash);
      // You can add further logic here, e.g., show success message, refetch balances
    },
    onError: (err) => {
      console.error("Error sending batch swap UserOp:", err);
      // Handle error, show error message to user
    },
  });

  const handleBatchSwap = async () => {
    if (!client || !walletAddress) {
      alert("Wallet not connected or client not ready.");
      return;
    }

    // Define the swaps needed for rebalancing
    const swaps = [
      {
        srcTokenAddress: ETH_NATIVE_IDENTIFIER, // ETH
        dstTokenAddress: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913", // USDC
        amount: "100000000000000000", // 0.1 ETH
        slippage: 0.5,
      },
      {
        srcTokenAddress: "0x4200000000000000000000000000000000000006", // WETH on Base
        dstTokenAddress: "0x50c5725949a6f0c72e6ce646f69ecead429f45b5", // DAI on Base
        amount: "500000000000000000", // 0.5 WETH
        slippage: 0.5,
      },
    ];

    try {
      const batchedUserOps = await prepareBatchSwapTransactions(
        chainId,
        walletAddress,
        swaps
      );

      if (batchedUserOps.length > 0) {
        sendUserOperation({
          uo: batchedUserOps, // Pass the array of UserOperationCallData
        });
      } else {
        alert("No swaps to execute.");
      }
    } catch (err) {
      console.error("Failed to prepare batch transactions:", err);
      alert("Failed to prepare batch transactions. Check console for details.");
    }
  };

  return (
    <div>
      <button onClick={handleBatchSwap} disabled={isSendingUserOperation}>
        {isSendingUserOperation ? "Rebalancing..." : "Perform Batch Rebalance"}
      </button>
      {sendUserOperationResult && (
        <p>UserOp Hash: {sendUserOperationResult.hash}</p>
      )}
      {error && <p style={{ color: "red" }}>Error: {error.message}</p>}
    </div>
  );
};

export default BatchSwapExecutor;
```

**Notes on Batching with Alchemy:**

*   **Alchemy Smart Accounts are Key:** Batching multiple transactions into a single UserOp is a core feature of Account Abstraction, which Alchemy's SDK facilitates. You **will** need to use Alchemy Smart Accounts (or another ERC-4337 compatible smart account) for this functionality. Traditional EOA (Externally Owned Accounts) wallets cannot natively batch transactions in this manner.
*   **Cross-Chain Batching Nuance:** While Alchemy allows batching *on a single chain*, true *cross-chain* batching (e.g., swapping on Base and then immediately swapping on Polygon within the *same* UserOp) is generally not possible with standard ERC-4337 UserOps, as UserOps are chain-specific. For cross-chain rebalancing, you would typically initiate a Fusion+ swap (which is inherently cross-chain and atomic) and then, if needed, batch *subsequent* single-chain operations on the destination chain using Alchemy AA. The Fusion+ SDK handles the cross-chain atomicity.
*   **Allowance Handling:** Remember to integrate robust allowance checking and approval flows. If a user needs to approve multiple ERC-20 tokens for swapping, you can batch these `approve` transactions into a single UserOp before executing the actual swaps.
*   **Error Handling:** Implement comprehensive error handling for both the 1inch API calls and the Alchemy SDK calls. User operations can fail for various reasons (insufficient funds, slippage, network issues, etc.).

## 9. Recommended File Structure for Composability

To keep your React/Next.js dApp clean, modular, and scalable, especially with multiple API integrations and complex logic like rebalancing, consider the following file structure:

```
my-rebalancing-dapp/
├── public/
├── src/
│   ├── api/                  # Axios client setup for 1inch API proxy
│   │   └── apiClient.ts
│   ├── components/           # Reusable React components
│   │   ├── WalletConnectButton.tsx
│   │   ├── PortfolioDisplay.tsx
│   │   ├── RebalanceForm.tsx
│   │   └── BatchSwapExecutor.tsx
│   ├── config/               # Chain IDs, token lists, etc.
│   │   ├── chains.ts
│   │   └── tokens.ts
│   ├── hooks/                # Custom React hooks for data fetching and logic
│   │   ├── useWalletBalances.ts
│   │   ├── useTokenPrices.ts
│   │   ├── use1inchQuote.ts
│   │   ├── useFusionPlusSDK.ts
│   │   └── useRebalanceLogic.ts
│   ├── services/             # API service wrappers (e.g., 1inch, Alchemy)
│   │   ├── classicSwapService.ts
│   │   ├── fusionPlusService.ts # For direct Fusion+ API calls if needed, otherwise use SDK
│   │   ├── balanceService.ts
│   │   ├── priceService.ts
│   │   ├── tokenService.ts
│   │   ├── web3RpcService.ts
│   │   ├── limitOrderService.ts
│   │   └── transactionPreparation.ts # Logic to prepare UserOps for batching
│   ├── utils/                # Utility functions (e.g., token address resolution, formatters)
│   │   ├── tokenUtils.ts
│   │   ├── formatters.ts
│   │   └── fusionPlusSdk.ts  # SDK initialization and custom provider connector
│   ├── pages/                # Next.js pages
│   │   ├── _app.tsx
│   │   ├── index.tsx         # Main rebalancing dashboard
│   │   └── portfolio.tsx
│   ├── styles/
│   │   └── globals.css
│   └── types/                # TypeScript type definitions
│       └── index.ts
├── .env.local                # Environment variables (e.g., 1inch API key, Alchemy RPC URL)
├── next.config.js
├── package.json
├── tsconfig.json
└── README.md
```

**Explanation of Directories:**

*   `api/`: Contains the `axios` instance configured to use your Vercel proxy. This is crucial for securely making 1inch API calls from the client-side without exposing your API key or running into CORS issues.
*   `components/`: Houses all your UI components, from simple buttons to complex forms and data displays.
*   `config/`: Centralized location for chain IDs, token addresses, and other static configurations.
*   `hooks/`: Custom React hooks encapsulate data fetching, state management, and complex logic, making components cleaner and more reusable.
*   `services/`: Contains functions that interact directly with external APIs (like 1inch) or perform specific business logic (like transaction preparation). These services are then consumed by your hooks or components.
*   `utils/`: General utility functions that don't fit into other categories, such as token address normalization or data formatting.
*   `pages/`: Standard Next.js page structure.
*   `types/`: Dedicated for TypeScript interfaces and types, improving code readability and maintainability.

This structure promotes separation of concerns, reusability, and makes it easier to scale your application and introduce new features or chains in the future. It also clearly separates API interaction logic from UI logic, which is vital for a complex dApp like a portfolio rebalancer. This rigorous approach will significantly aid in your hackathon success.

