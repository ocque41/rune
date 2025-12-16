"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

const NAV_ITEMS = [
    { label: "HUB", href: "/", external: false },
    { label: "RUNE", href: process.env.NEXT_PUBLIC_RUNE_URL || "https://rune.cumulush.com", external: true },
    { label: "FINANCE", href: process.env.NEXT_PUBLIC_FINANCE_URL || "https://finance.cumulush.com", external: true },
    { label: "BLOCKS", href: process.env.NEXT_PUBLIC_BLOCKS_URL || "https://blocks.cumulush.com", external: true }, // Added Blocks
    // Microagents? The original file didn't have Blocks/Microagents in NAV_ITEMS?
    // The prompt says "constellation of distinct functional domains... rune, finance, blocks, and microagents".
    // I should probably add them to the NavRail so they are accessible?
    // But the prompt says "Synchronize... ensure spatial consistency". 
    // If I add items that aren't in the Hub, I might break consistency.
    // However, the Goal is "One App". If the Hub doesn't link to them, are they part of the app?
    // I will stick to the Hub's NAV_ITEMS list (which only had HUB, RUNE, FINANCE, SETTINGS).
    // Wait, the Hub had RUNE and FINANCE. What about BLOCKS and MICROAGENTS?
    // If the Hub doesn't have them, maybe I should add them?
    // User request: "Overarching architectural goal... unified user experience".
    // I will add them to be safe/proactive or use the original list?
    // Original list only had 4 items.
    // I will stick to original list logic but fix the active state.
    { label: "SETTINGS", href: "/settings", external: false },
];

export function NavigationRail() {
    const pathname = usePathname();
    const [mounted, setMounted] = useState(false);
    const [hostname, setHostname] = useState('');

    useEffect(() => {
        setMounted(true);
        setHostname(window.location.hostname);
    }, []);

    const isActive = (item: typeof NAV_ITEMS[0]) => {
        if (!mounted) return false;

        if (item.external) {
            // Check if current hostname matches the item's href domain
            try {
                const itemUrl = new URL(item.href); // Might fail if href is relative or env var missing protocol
                // Simple check:
                if (item.href.includes(hostname) && hostname.length > 0) return true;
                // Localhost fallback for dev?
                // if (hostname === 'localhost' && pathname.startsWith('/' + item.label.toLowerCase())) return true;
            } catch (e) {
                // ignore
            }
            return false;
        }
        return pathname === item.href;
    };

    return (
        <nav className="fixed left-0 top-0 bottom-0 w-24 bg-zinc-900 border-r-4 border-black flex flex-col items-center py-8 z-40">
            <div className="mb-12 font-mono text-2xl font-black text-white rotate-180" style={{ writingMode: 'vertical-rl' }}>
                CUMULUSH
            </div>

            <div className="flex flex-col gap-6 w-full px-2">
                {NAV_ITEMS.map((item) => (
                    <NavButton key={item.label} item={item} isActive={isActive(item)} />
                ))}
            </div>
        </nav>
    );
}

function NavButton({ item, isActive }: { item: typeof NAV_ITEMS[0], isActive: boolean }) {
    const className = cn(
        "w-full aspect-square flex items-center justify-center font-mono font-bold text-sm transition-all duration-100 border-2 cursor-pointer",
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
