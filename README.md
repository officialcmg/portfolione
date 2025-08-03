# PortfoliOne 🎯

**One-click portfolio rebalancing for DeFi on Base**

PortfoliOne simplifies crypto portfolio management by allowing users to rebalance their entire portfolio with a single click. Built with Alchemy Account Kit and 1inch APIs, it transforms complex multi-step DeFi operations into seamless user experiences.

![PortfoliOne Demo](public/portfolione.png)

## ✨ Features

- **One-Click Rebalancing**: Set target allocations and rebalance your entire portfolio atomically
- **Smart Wallet Integration**: Email & social login with Alchemy Account Kit
- **Gasless Transactions**: ERC-4337 Account Abstraction for sponsored transactions
- **Real-time Portfolio Data**: Live token balances and prices from 1inch APIs
- **Atomic Swaps**: All rebalancing operations batched in a single UserOperation
- **Optimal Routing**: Intelligent swap optimization to minimize slippage and fees
- **Base Network**: Built for Base mainnet with popular tokens (USDC, WETH, DEGEN, HIGHER)
- **Modern UI**: Clean, responsive interface with real-time feedback

## 🏗️ Architecture

### Core Components
- **Portfolio Service**: Fetches real-time portfolio data from 1inch Portfolio API
- **Swap Optimizer**: Calculates optimal swap pairs for minimal transaction count
- **Classic Swap Service**: Integrates with 1inch Classic Swap API for route execution
- **Token Transfer Service**: Handles ERC-20 transfers with approval batching
- **Account Kit Integration**: Smart wallet management and UserOperation batching

### Tech Stack
- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **Smart Wallets**: Alchemy Account Kit (ERC-4337)
- **DeFi Integration**: 1inch APIs (Portfolio, Token Metadata, Classic Swap)
- **Blockchain**: Base mainnet, Viem for Ethereum interactions
- **UI Components**: Radix UI, Lucide React, Framer Motion

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- Alchemy Account Kit API key
- WalletConnect Project ID (optional)

### Installation

```bash
git clone https://github.com/officialcmg/portfolione.git
cd portfolione
npm install
```

### Environment Setup

Create a `.env.local` file:

```bash
cp .env.example .env.local
```

Add your API keys:

```env
NEXT_PUBLIC_ALCHEMY_API_KEY=your_alchemy_api_key
NEXT_PUBLIC_ALCHEMY_POLICY_ID=your_alchemy_policy_id
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_project_id
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

### Build & Deploy

```bash
npm run build
npm start
```

## 🎮 How to Use

1. **Connect Wallet**: Sign in with email or social login via Account Kit
2. **View Portfolio**: See your real-time token balances and USD values
3. **Set Targets**: Adjust target allocation percentages for each token
4. **Rebalance**: Click "Rebalance Portfolio" for one-click optimization
5. **Send Tokens**: Use the send modal for individual token transfers

## 🔧 Configuration

### API Keys Required

| Variable | Purpose | Required |
|----------|---------|----------|
| `NEXT_PUBLIC_ALCHEMY_API_KEY` | Account Kit authentication & RPC | Yes |
| `NEXT_PUBLIC_ALCHEMY_POLICY_ID` | Gas sponsorship policy | Yes |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | WalletConnect integration | Optional |

### Supported Networks
- **Base Mainnet** (Chain ID: 8453)
- Easily configurable for other EVM networks

### Supported Tokens
Any ERC-20 token on Base with 1inch liquidity support:
- USDC, WETH, DEGEN, HIGHER
- Automatically fetches token metadata and logos

## 🏛️ Smart Contract Integration

### Account Abstraction
- **ERC-4337 UserOperations**: All transactions batched atomically
- **Gas Sponsorship**: Gasless transactions via Alchemy Gas Manager
- **Session Management**: Persistent authentication across page reloads

### DeFi Protocols
- **1inch Classic Swap**: Optimal routing across DEX aggregators
- **ERC-20 Approvals**: Batched with swaps for gas efficiency
- **Slippage Protection**: Configurable slippage tolerance

## 🔒 Security Features

- **Input Validation**: Comprehensive form validation and error handling
- **Transaction Simulation**: Preview swaps before execution
- **Atomic Operations**: All-or-nothing transaction batching
- **Error Recovery**: Robust error handling with user feedback
- **Rate Limiting**: Built-in API request throttling

## 🚢 Deployment

### Vercel (Recommended)
```bash
npm run build
# Deploy to Vercel with environment variables
```

### Alternative Platforms
- Netlify
- Railway
- AWS Amplify
- DigitalOcean App Platform

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Alchemy Account Kit](https://www.alchemy.com/docs/wallets) for smart wallet infrastructure
- [1inch](https://1inch.io/) for DEX aggregation and portfolio APIs
- [Base](https://base.org/) for the L2 network
- Built for hackathons and DeFi innovation

---

**PortfoliOne** - Making DeFi portfolio management accessible to everyone 🚀

Note: for production, you should [protect](https://www.alchemy.com/docs/wallets/resources/faqs#how-should-i-protect-my-api-key-and-policy-id-in-the-frontend) your API key and policy ID behind a server rather than exposing client side.

### Run your app!

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), first **Login**, then try minting a new NFT.

Congrats! You've created a new smart wallet and sent your first sponsored transaction!

See what else you can do with [smart wallets](https://www.alchemy.com/docs/wallets/react/overview).

## 🗂 Project layout

```
app/           # Next.js pages & components
components/ui/ # shadcn/ui primitives
lib/           # constants & helpers
config.ts      # Account Kit + Gas Sponsorship setup
tailwind.config.ts
```

## 🏗️ How it works

1. `config.ts` initializes Account Kit with your API key, Arbitrum Sepolia chain, and Gas Sponsorship policy.
2. `Providers` wraps the app with `AlchemyAccountProvider` & React Query.
3. `LoginCard` opens the authentication modal (`useAuthModal`).
4. After login, `useSmartAccountClient` exposes the smart wallet.
5. `NftMintCard` uses `useSendUserOperation` to call `mintTo()` on the demo ERC‑721, with gas paid by the Paymaster.

## 📚 Docs & resources

- React Quickstart → [https://www.alchemy.com/docs/wallets/react/quickstart](https://www.alchemy.com/docs/wallets/react/quickstart)
- Gas Manager quickstart → [https://www.alchemy.com/docs/wallets/infra/quickstart](https://www.alchemy.com/docs/wallets/infra/quickstart)

## 🖥 Scripts

```bash
npm run dev     # start development server
npm run build   # production build
npm run start   # run production build
npm run lint    # lint code
```

## 🛂 License

MIT
