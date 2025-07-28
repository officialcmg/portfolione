# Portfolione Hackathon Roadmap 🚀

## Project Vision
**Modern portfolio rebalancing app on Base mainnet with composable, modular architecture designed for hackathon success and future cross-chain expansion.**

---

## 🎯 Hackathon Success Strategy

### Core Value Proposition
- **One-Click Portfolio Rebalancing** on Base mainnet
- **Real-time Portfolio Tracking** with beautiful visualizations
- **Gas-Sponsored Batched Transactions** via Alchemy Account Kit
- **Professional UI/UX** with shadcn/ui components
- **Composable Architecture** ready for cross-chain expansion

### Winning Differentiators
1. **Superior UX** - Account abstraction eliminates complex wallet interactions
2. **Real-time Data** - Live portfolio tracking and price updates
3. **Gas Optimization** - Batched swaps reduce transaction costs
4. **Professional Design** - Clean, intuitive interface
5. **Technical Excellence** - Modular, well-architected codebase

---

## 📋 Implementation Phases

### Phase 1: Foundation & Portfolio Display (Days 1-2)
**Goal:** Show user's current portfolio with beautiful UI

#### 1.1 Services Architecture Setup
```
services/
├── portfolioService.ts     # 1inch Portfolio API integration
├── balanceService.ts       # Token balance fetching
├── priceService.ts         # Real-time price data
├── classicSwapService.ts   # 1inch Classic Swap API
└── accountAbstractionService.ts # Alchemy batching
```

#### 1.2 Portfolio Service Implementation
**File:** `services/portfolioService.ts`
- Integrate 1inch Portfolio API for Base mainnet
- Functions (no classes):
  ```typescript
  export const portfolioService = {
    getPortfolio: async (address: string) => Promise<Portfolio>,
    getTokenBalances: async (address: string) => Promise<TokenBalance[]>,
    getPortfolioValue: async (address: string) => Promise<number>,
    getTokenPrices: async (tokenAddresses: string[]) => Promise<TokenPrice[]>
  }
  ```

#### 1.3 UI Components Development
```
components/
├── Portfolio/
│   ├── PortfolioOverview.tsx    # Main portfolio display
│   ├── TokenBalanceCard.tsx     # Individual token cards
│   ├── AllocationChart.tsx      # Pie chart of current allocations
│   └── PortfolioStats.tsx       # Total value, 24h change, etc.
└── ui/ (existing shadcn components)
```

#### 1.4 Portfolio Display Features
- **Current Holdings:** Token balances with USD values
- **Allocation Breakdown:** Visual pie chart of current percentages
- **Portfolio Stats:** Total value, 24h change, profit/loss
- **Real-time Updates:** Live price feeds and balance updates

### Phase 2: Target Allocation Input (Day 2-3)
**Goal:** Allow users to set desired portfolio allocations

#### 2.1 Target Allocation Components
```
components/
├── Rebalancing/
│   ├── AllocationInput.tsx      # Target percentage inputs
│   ├── AllocationSlider.tsx     # Visual slider for percentages
│   ├── RebalancePreview.tsx     # Show required swaps
│   └── SwapCalculator.tsx       # Calculate swap amounts
```

#### 2.2 Rebalancing Logic
**File:** `services/rebalancingService.ts`
```typescript
export const rebalancingService = {
  calculateRequiredSwaps: async (
    currentPortfolio: TokenBalance[],
    targetAllocations: AllocationTarget[]
  ) => Promise<RequiredSwap[]>,
  
  optimizeSwapPairs: (swaps: RequiredSwap[]) => RequiredSwap[],
  
  validateAllocations: (allocations: AllocationTarget[]) => ValidationResult
}
```

#### 2.3 UI Features
- **Target Input Form:** Percentage sliders for each token
- **Real-time Validation:** Ensure allocations sum to 100%
- **Visual Comparison:** Current vs target allocation charts
- **Swap Preview:** Show required trades before execution

### Phase 3: Swap Integration & Execution (Days 3-4)
**Goal:** Execute rebalancing swaps with Alchemy batching

#### 3.1 1inch Classic Swap Integration
**File:** `services/classicSwapService.ts`
```typescript
export const classicSwapService = {
  getQuote: async (params: SwapQuoteParams) => Promise<SwapQuote>,
  getSwapTransaction: async (params: SwapParams) => Promise<TransactionData>,
  getAllowance: async (tokenAddress: string, walletAddress: string) => Promise<string>,
  getApprovalTransaction: async (tokenAddress: string, amount: string) => Promise<TransactionData>
}
```

#### 3.2 Account Abstraction Batching
**File:** `services/accountAbstractionService.ts`
```typescript
export const accountAbstractionService = {
  batchTransactions: async (
    transactions: TransactionData[],
    smartAccountClient: AlchemySmartAccountClient
  ) => Promise<string>,
  
  waitForUserOperation: async (userOpHash: string) => Promise<TransactionReceipt>,
  
  estimateGas: async (transactions: TransactionData[]) => Promise<GasEstimate>
}
```

#### 3.3 Execution Flow
1. **Calculate Swaps:** Determine required trades for rebalancing
2. **Get Quotes:** Fetch best rates from 1inch for each swap
3. **Check Allowances:** Verify token approvals for 1inch router
4. **Batch Operations:** Combine approvals + swaps into single UserOperation
5. **Execute:** Submit batched transaction with gas sponsorship
6. **Monitor:** Track transaction status and update UI

### Phase 4: Polish & Demo Prep (Day 4-5)
**Goal:** Perfect the user experience and prepare for demo

#### 4.1 UI/UX Enhancements
- **Loading States:** Beautiful skeleton loaders during data fetching
- **Error Handling:** User-friendly error messages and recovery
- **Animations:** Smooth transitions and micro-interactions
- **Responsive Design:** Perfect mobile and desktop experience

#### 4.2 Demo Features
- **Demo Mode:** Pre-populated portfolio for showcasing
- **Transaction History:** Show past rebalancing operations
- **Performance Metrics:** Portfolio performance over time
- **Success Animations:** Celebrate successful rebalancing

---

## 🏗️ Technical Architecture

### Service Layer Design (No Classes)
All services use functional approach with exported objects:

```typescript
// services/portfolioService.ts
export const portfolioService = {
  // 1inch Portfolio API integration
  getPortfolio: async (address: string, chainId: number = 8453) => {
    // Implementation
  },
  
  getTokenBalances: async (address: string) => {
    // Implementation
  }
}

// services/classicSwapService.ts
export const classicSwapService = {
  // 1inch Classic Swap API integration
  getQuote: async (params: SwapQuoteParams) => {
    // Implementation
  },
  
  executeSwap: async (params: SwapExecutionParams) => {
    // Implementation
  }
}
```

### API Integration Strategy

#### 1inch Portfolio API
**Base URL:** `https://api.1inch.dev/portfolio/v4/`
**Key Endpoints:**
- `GET /portfolio/overview/{address}` - Get portfolio overview
- `GET /portfolio/details/{address}` - Get detailed token balances
- `GET /portfolio/profit_and_loss/{address}` - Get P&L data

#### 1inch Classic Swap API
**Base URL:** `https://api.1inch.dev/swap/v6.1/8453/` (Base mainnet)
**Key Endpoints:**
- `GET /quote` - Get swap quote
- `GET /swap` - Get swap transaction data
- `GET /approve/allowance` - Check token allowance
- `GET /approve/calldata` - Get approval transaction

#### Proxy Implementation
**File:** `pages/api/1inch-proxy/[...path].ts`
```typescript
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { path } = req.query;
  const apiPath = Array.isArray(path) ? path.join('/') : path;
  
  const response = await fetch(`https://api.1inch.dev/${apiPath}`, {
    method: req.method,
    headers: {
      'Authorization': `Bearer ${process.env.ONEINCH_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined,
  });
  
  const data = await response.json();
  res.status(response.status).json(data);
}
```

### Component Architecture

#### Portfolio Components
```typescript
// components/Portfolio/PortfolioOverview.tsx
export function PortfolioOverview() {
  const { data: portfolio, isLoading } = usePortfolio();
  
  return (
    <div className="grid gap-6">
      <PortfolioStats portfolio={portfolio} />
      <AllocationChart allocations={portfolio?.allocations} />
      <TokenBalanceList tokens={portfolio?.tokens} />
    </div>
  );
}

// components/Rebalancing/RebalanceForm.tsx
export function RebalanceForm() {
  const [targetAllocations, setTargetAllocations] = useState<AllocationTarget[]>([]);
  const { executeRebalancing } = useRebalancing();
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Set Target Allocations</CardTitle>
      </CardHeader>
      <CardContent>
        <AllocationInputs 
          allocations={targetAllocations}
          onChange={setTargetAllocations}
        />
        <RebalancePreview 
          current={currentPortfolio}
          target={targetAllocations}
        />
        <Button onClick={() => executeRebalancing(targetAllocations)}>
          Execute Rebalancing
        </Button>
      </CardContent>
    </Card>
  );
}
```

### Custom Hooks

```typescript
// hooks/usePortfolio.ts
export function usePortfolio() {
  const { client } = useSmartAccountClient({});
  const userAddress = client?.account?.address;
  
  return useQuery({
    queryKey: ['portfolio', userAddress],
    queryFn: () => portfolioService.getPortfolio(userAddress!),
    enabled: !!userAddress,
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

// hooks/useRebalancing.ts
export function useRebalancing() {
  const { client } = useSmartAccountClient({});
  
  const executeRebalancing = useMutation({
    mutationFn: async (targetAllocations: AllocationTarget[]) => {
      const swaps = await rebalancingService.calculateRequiredSwaps(
        currentPortfolio,
        targetAllocations
      );
      
      return accountAbstractionService.batchTransactions(swaps, client);
    },
    onSuccess: () => {
      // Show success message
      // Refresh portfolio data
    }
  });
  
  return { executeRebalancing };
}
```

---

## 🔧 Environment Setup

### Required Environment Variables
```env
# .env.local
NEXT_PUBLIC_ALCHEMY_API_KEY=your_alchemy_api_key
NEXT_PUBLIC_ALCHEMY_POLICY_ID=your_policy_id
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_walletconnect_id
ONEINCH_API_KEY=your_1inch_api_key
```

### Dependencies to Add
```bash
npm install @tanstack/react-query recharts
# For charts and data fetching
```

---

## 📊 Data Flow

### Portfolio Loading Flow
1. **User Connects Wallet** → Get wallet address
2. **Fetch Portfolio Data** → 1inch Portfolio API
3. **Get Token Prices** → 1inch Price API
4. **Calculate Allocations** → Process data for UI
5. **Display Portfolio** → Beautiful charts and cards

### Rebalancing Flow
1. **User Sets Targets** → Input desired allocations
2. **Calculate Swaps** → Determine required trades
3. **Get Quotes** → 1inch Classic Swap API
4. **Check Allowances** → Verify token approvals
5. **Batch Transactions** → Combine into UserOperation
6. **Execute** → Submit with gas sponsorship
7. **Monitor & Update** → Track status and refresh UI

---

## 🎨 UI/UX Design Principles

### Visual Design
- **shadcn/ui New York Style** - Clean, modern components
- **Gradient Accents** - Blue to purple gradients for CTAs
- **Card-based Layout** - Information organized in clean cards
- **Responsive Design** - Mobile-first approach

### User Experience
- **Progressive Disclosure** - Show complexity gradually
- **Real-time Feedback** - Live updates and status indicators
- **Error Prevention** - Validation and warnings before actions
- **Success Celebration** - Animations for completed actions

### Accessibility
- **Keyboard Navigation** - Full keyboard support
- **Screen Reader Support** - Proper ARIA labels
- **Color Contrast** - WCAG compliant color schemes
- **Focus Management** - Clear focus indicators

---

## 🚨 Risk Mitigation

### Technical Risks
1. **API Rate Limits** - Implement caching and request queuing
2. **Network Issues** - Retry logic and fallback states
3. **Gas Estimation** - Add buffers and dynamic estimation
4. **Slippage** - Real-time slippage calculation

### User Experience Risks
1. **Complex Flows** - Progressive disclosure and guided onboarding
2. **Transaction Failures** - Clear error messages and recovery options
3. **Loading Times** - Skeleton loaders and optimistic updates
4. **Mobile Experience** - Responsive design and touch-friendly interfaces

---

## 📈 Success Metrics

### Demo Day KPIs
1. **Smooth Demo Flow** - No technical issues during presentation
2. **Visual Impact** - Beautiful, professional interface
3. **Feature Completeness** - All core features working
4. **Performance** - Fast loading and responsive interactions

### Technical Excellence
1. **Code Quality** - Clean, well-documented code
2. **Architecture** - Modular, scalable design
3. **Error Handling** - Comprehensive error states
4. **Testing** - Key functionality tested

---

## 🎯 Day-by-Day Execution Plan

### Day 1: Foundation
- [ ] Set up services folder structure
- [ ] Implement portfolioService with 1inch Portfolio API
- [ ] Create basic portfolio display components
- [ ] Set up API proxy for 1inch calls

### Day 2: Portfolio UI
- [ ] Build PortfolioOverview component
- [ ] Implement AllocationChart with recharts
- [ ] Add TokenBalanceCard components
- [ ] Create real-time price updates

### Day 3: Rebalancing Logic
- [ ] Implement rebalancingService
- [ ] Build AllocationInput components
- [ ] Create RebalancePreview
- [ ] Integrate 1inch Classic Swap API

### Day 4: Execution & Batching
- [ ] Implement accountAbstractionService
- [ ] Build transaction batching logic
- [ ] Add execution flow with status tracking
- [ ] Implement error handling

### Day 5: Polish & Demo
- [ ] Add loading states and animations
- [ ] Perfect mobile responsiveness
- [ ] Create demo mode with sample data
- [ ] Practice demo presentation

---

## 🏆 Hackathon Presentation Strategy

### Demo Script (5 minutes)
1. **Problem Statement** (30s) - Complex portfolio rebalancing
2. **Solution Overview** (30s) - One-click rebalancing on Base
3. **Live Demo** (3m) - Show portfolio → set targets → execute
4. **Technical Highlights** (1m) - Architecture and innovation
5. **Future Vision** (30s) - Cross-chain expansion

### Key Talking Points
- **Account Abstraction** - Gasless, batched transactions
- **Base Mainnet** - Fast, low-cost operations
- **1inch Integration** - Best swap rates and deep liquidity
- **Composable Design** - Ready for cross-chain expansion
- **Professional UX** - Bank-grade interface

---

## 🔮 Future Roadmap

### Post-Hackathon Features
1. **Cross-Chain Support** - 1inch Fusion+ integration
2. **Advanced Strategies** - DCA, momentum-based rebalancing
3. **Social Features** - Share portfolios and strategies
4. **Analytics** - Performance tracking and insights
5. **Mobile App** - Native iOS/Android applications
