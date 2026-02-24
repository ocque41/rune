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
    <header className="flex items-center justify-between border-b border-white/10 px-8 py-4">
      <div className="flex items-center gap-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-sm font-semibold text-white">
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
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs transition",
                active
                  ? "border-white/30 bg-white/10 text-white"
                  : "border-white/10 text-white/50 hover:text-white"
              )}
            >
              {item.label}
            </Link>
          );
        })}
        <a
          href="https://cumulush.com/dashboard"
          className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/50 transition hover:bg-white/5 hover:text-white"
        >
          Back to Dashboard
        </a>
      </div>
    </header>
  );
}
