import "@/lib/react-shim";
import type { Metadata } from "next";
import { anonymousPro } from "./fonts";
import { Toaster } from 'sonner';
import React from 'react';
import "./globals.css";
import { TransitionCurtain } from "@/components/TransitionCurtain";
import { AuthProvider } from "@/components/providers/auth-provider";
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
        className={`${anonymousPro.variable} antialiased`}
      >
        <AuthProvider>
          <TransitionCurtain />
          {children}
          <Toaster
            position="top-center"
            richColors
            toastOptions={{
              style: {
                background: 'hsl(var(--background))',
                color: 'hsl(var(--foreground))',
                border: '1px solid hsl(var(--border))',
                fontFamily: 'var(--font-anonymous-pro)',
              },
              className: 'group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg',
            }}
          />
        </AuthProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
