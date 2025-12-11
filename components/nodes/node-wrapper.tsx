import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { useEnterAnimation, animatePulse } from '@/lib/animation-utils';
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
                ? 'border-blue-500 bg-[#0f172a] shadow-[0_0_20px_rgba(59,130,246,0.3)]'
                : 'border-white/10 bg-[#0f172a]/80 hover:border-white/20'
                } ${className}`}
            style={{
                backdropFilter: 'blur(10px)',
                minWidth: '200px',
                ...style
            }}
        >
            {/* Standard Handles if provided, otherwise children should render them */}
            {handles.map((handle, index) => (
                <Handle
                    key={`${handle.type}-${index}`}
                    type={handle.type}
                    position={handle.position}
                    id={handle.id}
                    className="!bg-blue-500 !w-3 !h-3 !border-2 !border-[#0f172a]"
                />
            ))}

            {children}
        </div>
    );
});

NodeWrapper.displayName = 'NodeWrapper';
