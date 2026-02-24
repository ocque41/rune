"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Workflows" },
  { href: "/editor", label: "Editor" },
  { href: "/runs", label: "Runs" },
  { href: "/autonomy", label: "Autonomy" }
];

export function AppHeader() {
  const pathname = usePathname();

  return (
    <header className="flex items-center justify-between border-b border-white/12 bg-[color:var(--metric-surface-1)] px-8 py-4">
      <div className="flex items-center gap-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/14 bg-[color:var(--metric-surface-3)] text-sm font-semibold text-white">
          R
        </div>
        <div>
          <p className="text-xs text-white/40">Rune</p>
          <h1 className="text-lg font-semibold text-white">Workflow Command Deck</h1>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {navItems.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={`Go to ${item.label}`}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs transition",
                active
                  ? "border-white/28 bg-white/12 text-white"
                  : "border-white/14 bg-[color:var(--metric-surface-2)] text-white/65 hover:border-white/25 hover:text-white"
              )}
            >
              {item.label}
            </Link>
          );
        })}
        <a
          href="https://cumulush.com/dashboard"
          title="Open the Cumulus account dashboard"
          className="rounded-full border border-white/14 bg-[color:var(--metric-surface-2)] px-3 py-1.5 text-xs text-white/65 transition hover:border-white/25 hover:bg-[color:var(--metric-surface-3)] hover:text-white"
        >
          Back to Dashboard
        </a>
      </div>
    </header>
  );
}
