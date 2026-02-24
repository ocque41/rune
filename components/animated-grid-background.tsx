'use client';

import React from 'react';

interface AnimatedGridBackgroundProps {
    className?: string;
}

export const AnimatedGridBackground: React.FC<AnimatedGridBackgroundProps> = ({ className }) => {
    return (
        <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className ?? ''}`}>
            <div className="absolute inset-0 bg-[color:var(--metric-surface-0)]" />
            <div className="absolute inset-0 opacity-30">
                <div className="absolute inset-6 rounded-2xl border border-white/[0.04]" />
                <div className="absolute left-0 right-0 top-1/3 h-px bg-white/[0.04]" />
                <div className="absolute left-0 right-0 top-2/3 h-px bg-white/[0.04]" />
                <div className="absolute bottom-0 top-0 left-1/3 w-px bg-white/[0.04]" />
                <div className="absolute bottom-0 top-0 left-2/3 w-px bg-white/[0.04]" />
            </div>
            <div className="animated-field absolute -inset-[20%] opacity-20" />
            <style jsx>{`
                .animated-field {
                    background-color: rgba(255, 255, 255, 0.08);
                    filter: blur(80px);
                    animation: drift 18s ease-in-out infinite alternate;
                }

                @keyframes drift {
                    from {
                        transform: translate3d(-2%, -1%, 0) scale(1);
                    }
                    to {
                        transform: translate3d(2%, 1%, 0) scale(1.05);
                    }
                }
            `}</style>
        </div>
    );
};
