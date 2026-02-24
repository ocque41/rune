"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
    { label: "Hub", href: "/", external: false },
    { label: "Rune", href: process.env.NEXT_PUBLIC_RUNE_URL || "https://rune.cumulush.com", external: true },
    { label: "Finance", href: process.env.NEXT_PUBLIC_FINANCE_URL || "https://finance.cumulush.com", external: true },
    { label: "Blocks", href: process.env.NEXT_PUBLIC_BLOCKS_URL || "https://blocks.cumulush.com", external: true }, // Added Blocks
    { label: "Settings", href: "/settings", external: false },
];

export function NavigationRail() {
    const pathname = usePathname();
    const hostname = typeof window !== "undefined" ? window.location.hostname : "";

    const isActive = (item: typeof NAV_ITEMS[0]) => {
        if (item.external) {
            try {
                const itemHost = new URL(item.href).hostname;
                return Boolean(hostname) && hostname === itemHost;
            } catch {
                return false;
            }
        }
        return pathname === item.href;
    };

    return (
        <nav className="fixed left-0 top-0 bottom-0 w-24 bg-zinc-900 border-r-4 border-black flex flex-col items-center py-8 z-40">
            <a
                href="https://cumulush.com/dashboard"
                className="mb-12 rounded border border-white/20 bg-black/40 px-2 py-1 text-xs text-white transition-colors duration-200 hover:bg-black/70"
                aria-label="Back to Dashboard"
            >
                Back
            </a>

            <div className="flex flex-col gap-6 w-full px-2 flex-1">
                {NAV_ITEMS.map((item) => (
                    <NavButton key={item.label} item={item} isActive={isActive(item)} />
                ))}
            </div>

            <div className="mt-auto pt-6 text-[10px] text-white/40">
                Alerts
            </div>
        </nav>
    );
}

function NavButton({ item, isActive }: { item: typeof NAV_ITEMS[0], isActive: boolean }) {
    const className = cn(
        "w-full aspect-square flex items-center justify-center font-mono font-bold text-xs transition-all duration-100 border-2 cursor-pointer",
        isActive
            ? "bg-[var(--neon-green)] text-black border-transparent shadow-[4px_4px_0px_#fff]"
            : "bg-black text-white border-zinc-700 hover:border-[var(--neon-green)] hover:text-[var(--neon-green)] active:translate-x-1 active:translate-y-1 active:shadow-none"
    );

    if (item.external) {
        return (
            <a href={item.href} className={className}>
                {item.label}
            </a>
        );
    }

    return (
        <Link href={item.href} className={className}>
            {item.label}
        </Link>
    );
}
