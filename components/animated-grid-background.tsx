'use client';

import React, { useEffect, useRef, useState } from 'react';

interface AnimatedGridBackgroundProps {
    className?: string;
}

export const AnimatedGridBackground: React.FC<AnimatedGridBackgroundProps> = ({ className }) => {
    const [dots, setDots] = useState<{ x: number; y: number; delay: number }[]>([]);

    useEffect(() => {
        const cols = Math.ceil(window.innerWidth / 50);
        const rows = Math.ceil(window.innerHeight / 50);
        const newDots: { x: number; y: number; delay: number }[] = [];

        const centerX = cols / 2;
        const centerY = rows / 2;

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                // Calculate distance from center for stagger effect
                const distFromCenter = Math.sqrt(
                    Math.pow(col - centerX, 2) + Math.pow(row - centerY, 2)
                );
                newDots.push({
                    x: col * 50 + 25,
                    y: row * 50 + 25,
                    delay: distFromCenter * 0.08, // Stagger based on distance
                });
            }
        }
        setDots(newDots);
    }, []);

    return (
        <div
            className={`absolute inset-0 overflow-hidden pointer-events-none ${className || ''}`}
            style={{
                background: 'linear-gradient(180deg, #000000 0%, #020208 50%, #000000 100%)',
            }}
        >
            {/* CSS Grid lines */}
            <div
                className="absolute inset-0 opacity-[0.03]"
                style={{
                    backgroundImage: `
                        linear-gradient(to right, #F0EEE9 1px, transparent 1px),
                        linear-gradient(to bottom, #F0EEE9 1px, transparent 1px)
                    `,
                    backgroundSize: '50px 50px',
                }}
            />

            {/* Animated dots */}
            {dots.map((dot, i) => (
                <div
                    key={i}
                    className="absolute animate-pulse-glow"
                    style={{
                        left: dot.x,
                        top: dot.y,
                        width: 3,
                        height: 3,
                        borderRadius: '50%',
                        background: 'rgba(240, 238, 233, 0.4)',
                        boxShadow: '0 0 6px rgba(240, 238, 233, 0.3)',
                        animationDelay: `${dot.delay}s`,
                        transform: 'translate(-50%, -50%)',
                    }}
                />
            ))}

            {/* Subtle radial gradient overlay */}
            <div
                className="absolute inset-0"
                style={{
                    background: 'radial-gradient(ellipse at 50% 50%, transparent 0%, #000000 70%)',
                }}
            />

            <style jsx>{`
                @keyframes pulse-glow {
                    0%, 100% {
                        opacity: 0.2;
                        transform: translate(-50%, -50%) scale(1);
                    }
                    50% {
                        opacity: 0.6;
                        transform: translate(-50%, -50%) scale(1.5);
                    }
                }
                .animate-pulse-glow {
                    animation: pulse-glow 4s ease-in-out infinite;
                }
            `}</style>
        </div>
    );
};
