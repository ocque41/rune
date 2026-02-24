import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { useEnterAnimation } from '@/lib/animation-utils';
// animejs import removed

interface NodeWrapperProps {
    children: React.ReactNode;
    selected?: boolean;
    className?: string;
    style?: React.CSSProperties;
    // Handles configuration
    handles?: { type: 'source' | 'target'; position: Position; id?: string }[];
}

export const NodeWrapper = memo(({ children, selected, className, style, handles = [] }: NodeWrapperProps) => {
    // Animate in when mounted
    const ref = useEnterAnimation(100);

    // Pulse effect when selected
    // Pulse effect when selected
    // Pulse animation removed

    return (
        <div
            ref={ref}
            className={`relative rounded-xl border-2 transition-colors duration-300 ${selected
                ? 'border-white/30 shadow-[0_0_24px_rgba(255,255,255,0.08)]'
                : 'border-white/14 hover:border-white/28'
                } ${className}`}
            style={{
                backgroundColor: 'var(--node-background, #101010)',
                backdropFilter: 'blur(14px)',
                minWidth: '200px',
                ...style
            }}
        >
            {/* Standard Handles if provided, otherwise children should render them */}
            {handles?.map((handle, index) => (
                <Handle
                    key={index}
                    type={handle.type}
                    position={handle.position}
                    id={handle.id}
                    className="!bg-[color:var(--text)] !w-3 !h-3 !border-2 !border-[color:var(--bg)]"
                />
            ))}

            {children}
        </div>
    );
});

NodeWrapper.displayName = 'NodeWrapper';
