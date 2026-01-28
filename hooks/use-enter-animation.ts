"use client";

import { useEffect, useRef } from 'react';
import anime from 'animejs';

interface UseEnterAnimationProps {
    selector: string;
    stagger?: number;
    delay?: number;
}

export function useEnterAnimation({ selector, stagger = 50, delay = 0 }: UseEnterAnimationProps) {
    const scopeRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!scopeRef.current) return;

        // Check for reduced motion preference
        const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        const targets = scopeRef.current.querySelectorAll(selector);

        if (prefersReducedMotion) {
            // Instant visibility for reduced motion
            anime({
                targets,
                opacity: 1,
                translateY: 0,
                duration: 0
            });
            return;
        }

        // Animate in
        anime({
            targets,
            opacity: [0, 1],
            translateY: [10, 0],
            delay: anime.stagger(stagger, { start: delay }),
            easing: 'easeOutQuad',
            duration: 400
        });

    }, [selector, stagger, delay]);

    return scopeRef;
}
