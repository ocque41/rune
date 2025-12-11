import { useEffect, useRef, useCallback } from 'react';

// --- Types ---
type AnimationTarget = HTMLElement | SVGElement | NodeList | string;

interface HoverOptions {
    scale?: number;
    duration?: number;
    easing?: string;
}

// --- Utility Functions ---

/**
 * Animate an element entering the screen (e.g., scale up + fade in)
 */
export const animateEnter = (target: AnimationTarget, delay: number = 0) => {
    // No-op for now to fix rendering issues
    return { pause: () => { } };
};

export const animateExit = (target: AnimationTarget) => {
    // No-op
    return { pause: () => { } };
};

export const animateHover = (target: AnimationTarget, options: HoverOptions = {}) => {
    // No-op
    return { pause: () => { } };
};

export const animateHoverExit = (target: AnimationTarget, options: HoverOptions = {}) => {
    // No-op
    return { pause: () => { } };
};

export const animatePulse = (target: AnimationTarget) => {
    // No-op
    return { pause: () => { } };
};

// --- Hooks ---

/**
 * Hook to apply an enter animation on mount
 */
export const useEnterAnimation = (delay: number = 0) => {
    const ref = useRef<HTMLDivElement>(null);
    // Animation removed
    return ref;
};

/**
 * Hook for hover effects
 */
export const useHoverAnimation = (options?: HoverOptions) => {
    const ref = useRef<HTMLDivElement>(null);

    const onMouseEnter = useCallback(() => {
        // No-op
    }, [options]);

    const onMouseLeave = useCallback(() => {
        // No-op
    }, [options]);

    return { ref, onMouseEnter, onMouseLeave };
};
