import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
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
                ? 'border-[color:var(--title)]/30 shadow-[0_0_20px_rgba(255,255,255,0.08)]'
                : 'border-[color:var(--border-color)] hover:border-[color:var(--subtitle)]/60'
                } ${className}`}
            style={{
                backgroundColor: 'var(--node-background, #1A1A1A)',
                backdropFilter: 'blur(10px)',
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
