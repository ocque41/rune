'use client';

import { Drawer } from 'vaul';
import { cn } from '@/lib/utils';

interface DrawerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    children: React.ReactNode;
    direction?: 'bottom' | 'right';
    className?: string;
}

export function RuneDrawer({ open, onOpenChange, children, direction = 'bottom', className }: DrawerProps) {
    return (
        <Drawer.Root open={open} onOpenChange={onOpenChange} direction={direction}>
            <Drawer.Portal>
                <Drawer.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50" />
                <Drawer.Content
                    className={cn(
                        "fixed z-50 flex flex-col bg-[#0A0A0A] border border-[var(--neon-green)]/20 shadow-2xl focus:outline-none",
                        direction === 'bottom' ? "bottom-0 left-0 right-0 h-[85vh] rounded-t-[10px]" : "right-0 top-0 bottom-0 w-[400px] h-full rounded-l-[10px]",
                        className
                    )}
                >
                    <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-[var(--neon-green)]/20 mb-4 mt-4" />
                    <div className="flex-1 overflow-auto p-4">
                        {children}
                    </div>
                </Drawer.Content>
            </Drawer.Portal>
        </Drawer.Root>
    );
}
