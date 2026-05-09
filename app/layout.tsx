import "@/lib/react-shim";
import type { Metadata } from "next";
import { anonymousPro, draftingMono } from "./fonts";
import { Toaster } from 'sonner';
import React from 'react';
import "./globals.css";
import { TransitionCurtain } from "@/components/TransitionCurtain";
import { AuthProvider } from "@/components/providers/auth-provider";
import { AutoTooltipHints } from "@/components/ui/auto-tooltip-hints";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/next';

export const metadata: Metadata = {
  title: "Cumulus Automation",
  description: "Precision workflow automation with clarity and customization",
};

// ... imports

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${anonymousPro.variable} ${draftingMono.variable} antialiased`}
      >
        <AuthProvider>
          <TooltipProvider delayDuration={300}>
            <TransitionCurtain />
            <AutoTooltipHints />
            {children}
            <Toaster
              position="top-center"
              richColors
              toastOptions={{
                style: {
                  background: 'var(--background)',
                  color: 'var(--foreground)',
                  border: '1px solid var(--border)',
                  fontFamily: 'var(--font-anonymous)',
                },
                className: 'group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg',
              }}
            />
          </TooltipProvider>
        </AuthProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
