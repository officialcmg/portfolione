# Environment Variables Documentation

## Overview
This document details all environment variables used in the Portfolione MiniApp and their specific usage locations.

## Required Variables

### Alchemy Account Kit
| Variable | File Usage | Purpose |
|----------|------------|---------|
| `NEXT_PUBLIC_ALCHEMY_API_KEY` | `config.ts` | Creates Alchemy transport for Account Kit smart wallets |
| `NEXT_PUBLIC_ALCHEMY_POLICY_ID` | `config.ts` | Gas sponsorship policy for transaction fee coverage |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | `config.ts` | Required by Account Kit (even if WalletConnect is disabled) |

### MiniKit Core
| Variable | File Usage | Purpose |
|----------|------------|---------|
| `NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME` | `app/layout.tsx`, `app/.well-known/farcaster.json/route.ts` | App name in Base App and Farcaster |
| `NEXT_PUBLIC_URL` | `app/layout.tsx`, `app/.well-known/farcaster.json/route.ts` | Base URL for manifest and frame metadata |
| `NEXT_PUBLIC_ONCHAINKIT_API_KEY` | `providers/MiniKitProvider.tsx` | Coinbase Developer Platform API key |

### Farcaster Manifest (Generated)
| Variable | File Usage | Purpose |
|----------|------------|---------|
| `FARCASTER_HEADER` | `app/.well-known/farcaster.json/route.ts` | Account verification header |
| `FARCASTER_PAYLOAD` | `app/.well-known/farcaster.json/route.ts` | Account association payload |
| `FARCASTER_SIGNATURE` | `app/.well-known/farcaster.json/route.ts` | Cryptographic signature |

## Optional Variables

### App Metadata
| Variable | File Usage | Purpose |
|----------|------------|---------|
| `NEXT_PUBLIC_APP_SUBTITLE` | `app/layout.tsx`, `app/.well-known/farcaster.json/route.ts` | Short app description |
| `NEXT_PUBLIC_APP_DESCRIPTION` | `app/layout.tsx`, `app/.well-known/farcaster.json/route.ts` | Detailed app description |
| `NEXT_PUBLIC_APP_PRIMARY_CATEGORY` | `app/.well-known/farcaster.json/route.ts` | App category for discovery |
| `NEXT_PUBLIC_APP_TAGLINE` | `app/layout.tsx`, `app/.well-known/farcaster.json/route.ts` | Marketing tagline |
| `NEXT_PUBLIC_SPLASH_BACKGROUND_COLOR` | `app/layout.tsx`, `app/.well-known/farcaster.json/route.ts` | Loading screen background |

### Social Media & Assets
| Variable | File Usage | Purpose |
|----------|------------|---------|
| `NEXT_PUBLIC_APP_ICON` | `app/.well-known/farcaster.json/route.ts` | App icon URL |
| `NEXT_PUBLIC_APP_SPLASH_IMAGE` | `app/layout.tsx`, `app/.well-known/farcaster.json/route.ts` | Loading screen image |
| `NEXT_PUBLIC_APP_HERO_IMAGE` | `app/layout.tsx`, `app/.well-known/farcaster.json/route.ts` | Social embed preview image |
| `NEXT_PUBLIC_APP_OG_TITLE` | `app/layout.tsx`, `app/.well-known/farcaster.json/route.ts` | Open Graph title |
| `NEXT_PUBLIC_APP_OG_DESCRIPTION` | `app/layout.tsx`, `app/.well-known/farcaster.json/route.ts` | Open Graph description |
| `NEXT_PUBLIC_APP_OG_IMAGE` | `app/layout.tsx`, `app/.well-known/farcaster.json/route.ts` | Open Graph image |

## File-by-File Usage

### `config.ts`
- `NEXT_PUBLIC_ALCHEMY_API_KEY` - Alchemy transport configuration
- `NEXT_PUBLIC_ALCHEMY_POLICY_ID` - Gas sponsorship policy
- `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` - Account Kit requirement

### `app/layout.tsx` (generateMetadata function)
- `NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME` - Page title and frame name
- `NEXT_PUBLIC_APP_DESCRIPTION` - Meta description
- `NEXT_PUBLIC_URL` - Frame launch URL
- `NEXT_PUBLIC_APP_HERO_IMAGE` - Frame preview image
- `NEXT_PUBLIC_APP_SPLASH_IMAGE` - Frame splash image
- `NEXT_PUBLIC_SPLASH_BACKGROUND_COLOR` - Frame splash background

### `providers/MiniKitProvider.tsx`
- `NEXT_PUBLIC_ONCHAINKIT_API_KEY` - MiniKit provider configuration

### `app/.well-known/farcaster.json/route.ts`
- `FARCASTER_HEADER` - Account association
- `FARCASTER_PAYLOAD` - Account association  
- `FARCASTER_SIGNATURE` - Account association
- `NEXT_PUBLIC_URL` - Home and webhook URLs
- All `NEXT_PUBLIC_APP_*` variables - Frame metadata

## Setup Instructions

1. **Get Alchemy credentials**: https://dashboard.alchemy.com/
2. **Get CDP API key**: https://portal.cdp.coinbase.com/
3. **Deploy app** to get stable HTTPS URL
4. **Generate Farcaster manifest**: `npx create-onchain --manifest`
5. **Upload assets** to `/public/` directory
6. **Test manifest**: Visit `https://your-app.com/.well-known/farcaster.json`