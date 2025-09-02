import { config } from "@/config";
import { cookieToInitialState } from "@account-kit/core";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";
import { Providers } from "./providers";
import { MiniKitContextProvider } from "@/providers/MiniKitProvider";
import { WagmiContextProvider } from "@/providers/WagmiProvider";

const inter = Inter({ subsets: ["latin"] });

export async function generateMetadata(): Promise<Metadata> {
  const URL = process.env.NEXT_PUBLIC_URL as string;
  return {
    title: process.env.NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME || "Portfolione - Smart Portfolio Rebalancing",
    description: process.env.NEXT_PUBLIC_APP_DESCRIPTION || "One-click portfolio rebalancing on Base mainnet with Alchemy Account Kit",
    icons: {
      icon: "/favicon.ico",
      shortcut: "/favicon.ico",
      apple: "/portfolione.png",
    },
    other: {
      'fc:frame': JSON.stringify({
        version: 'next',
        imageUrl: process.env.NEXT_PUBLIC_APP_HERO_IMAGE,
        button: {
          title: `Launch ${process.env.NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME || 'Portfolione'}`,
          action: {
            type: 'launch_frame',
            name: process.env.NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME || 'Portfolione',
            url: URL,
            splashImageUrl: process.env.NEXT_PUBLIC_APP_SPLASH_IMAGE,
            splashBackgroundColor: process.env.NEXT_PUBLIC_SPLASH_BACKGROUND_COLOR || '#6366f1',
          },
        },
      }),
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Persist state across pages
  // https://www.alchemy.com/docs/wallets/react/ssr#persisting-the-account-state
  const initialState = cookieToInitialState(
    config,
    headers().get("cookie") ?? undefined
  );

  return (
    <html lang="en">
      <body className={`${inter.className} min-h-screen bg-gradient-to-b from-background to-muted/30`}>
        <div className="min-h-screen bg-bg-main bg-cover bg-center bg-no-repeat bg-fixed">
          <MiniKitContextProvider>
            <WagmiContextProvider>
              <Providers initialState={initialState}>{children}</Providers>
            </WagmiContextProvider>
          </MiniKitContextProvider>
        </div>
      </body>
    </html>
  );
}
