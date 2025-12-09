import { animate } from 'animejs';
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
// ... (imports)

// ...

export const animateEnter = (target: AnimationTarget, delay: number = 0) => {
    return animate(target, {
        opacity: [0, 1],
        scale: [0.8, 1],
        translateY: [20, 0],
        duration: 600,
        delay: delay,
        easing: 'easeOutElastic(1, .6)',
    });
};

export const animateExit = (target: AnimationTarget) => {
    return animate(target, {
        opacity: 0,
        scale: 0.8,
        duration: 400,
        easing: 'easeInBack',
    });
};

export const animateHover = (target: AnimationTarget, options: HoverOptions = {}) => {
    const { scale = 1.05, duration = 300, easing = 'easeOutQuad' } = options;
    return animate(target, {
        scale: scale,
        duration: duration,
        easing: easing,
    });
};

export const animateHoverExit = (target: AnimationTarget, options: HoverOptions = {}) => {
    const { duration = 300, easing = 'easeOutQuad' } = options;
    return animate(target, {
        scale: 1,
        duration: duration,
        easing: easing,
    });
};

export const animatePulse = (target: AnimationTarget) => {
    return animate(target, {
        scale: [1, 1.05, 1],
        opacity: [1, 0.8, 1],
        duration: 1500,
        loop: true,
        easing: 'easeInOutSine',
    });
};

// ... (Effect hooks remain the same as they use these functions)

// --- Hooks ---

/**
 * Hook to apply an enter animation on mount
 */
export const useEnterAnimation = (delay: number = 0) => {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (ref.current) {
            animateEnter(ref.current, delay);
        }
    }, [delay]);

    return ref;
};

/**
 * Hook for hover effects
 */
export const useHoverAnimation = (options?: HoverOptions) => {
    const ref = useRef<HTMLDivElement>(null);

    const onMouseEnter = useCallback(() => {
        if (ref.current) animateHover(ref.current, options);
    }, [options]);

    const onMouseLeave = useCallback(() => {
        if (ref.current) animateHoverExit(ref.current, options);
    }, [options]);

    return { ref, onMouseEnter, onMouseLeave };
};
