'use client';

import React from 'react';

interface AnimatedGridBackgroundProps {
    className?: string;
}

export const AnimatedGridBackground: React.FC<AnimatedGridBackgroundProps> = ({ className }) => {
    return (
        <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className ?? ''}`}>
            <div
                className="absolute inset-0"
                style={{
                    background:
                        'radial-gradient(circle at 14% 18%, rgba(255,255,255,0.06), transparent 36%), radial-gradient(circle at 84% 8%, rgba(255,255,255,0.04), transparent 32%), linear-gradient(180deg, #040404 0%, #080808 60%, #030303 100%)',
                }}
            />
            <div
                className="absolute inset-0 opacity-25"
                style={{
                    backgroundImage:
                        'linear-gradient(to right, rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px)',
                    backgroundSize: '42px 42px',
                    maskImage: 'radial-gradient(circle at center, black 35%, transparent 88%)',
                }}
            />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0),rgba(0,0,0,0.75)_70%)]" />
            <div className="animated-haze absolute -inset-[20%] opacity-20" />
            <style jsx>{`
                .animated-haze {
                    background: radial-gradient(circle at 50% 50%, rgba(255, 255, 255, 0.12), transparent 55%);
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
