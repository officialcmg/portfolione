import { config } from "@/config";
import { cookieToInitialState } from "@account-kit/core";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Portfolione - Smart Portfolio Rebalancing",
  description: "One-click portfolio rebalancing on Base mainnet with Alchemy Account Kit",
};

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
          <Providers initialState={initialState}>{children}</Providers>
        </div>
      </body>
    </html>
  );
}
