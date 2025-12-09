import anime from 'animejs';
import { useEffect, useRef, useCallback } from 'react';

// --- Types ---
type AnimationTarget = HTMLElement | SVGElement | NodeList | string | null;

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
    return anime({
        targets: target,
        opacity: [0, 1],
        scale: [0.8, 1],
        translateY: [20, 0],
        duration: 600,
        delay: delay,
        easing: 'easeOutElastic(1, .6)',
    });
};

/**
 * Animate an element exiting the screen (e.g., scale down + fade out)
 */
export const animateExit = (target: AnimationTarget) => {
    return anime({
        targets: target,
        opacity: 0,
        scale: 0.8,
        duration: 400,
        easing: 'easeInBack',
    });
};

/**
 * Create a hover effect (scale up) for an element
 */
export const animateHover = (target: AnimationTarget, options: HoverOptions = {}) => {
    const { scale = 1.05, duration = 300, easing = 'easeOutQuad' } = options;
    return anime({
        targets: target,
        scale: scale,
        duration: duration,
        easing: easing,
    });
};

/**
 * Reset hover effect (scale back to 1)
 */
export const animateHoverExit = (target: AnimationTarget, options: HoverOptions = {}) => {
    const { duration = 300, easing = 'easeOutQuad' } = options;
    return anime({
        targets: target,
        scale: 1,
        duration: duration,
        easing: easing,
    });
};

/**
 * Pulse animation for attention or selection
 */
export const animatePulse = (target: AnimationTarget) => {
    return anime({
        targets: target,
        scale: [1, 1.05, 1],
        opacity: [1, 0.8, 1],
        duration: 1500,
        loop: true,
        easing: 'easeInOutSine',
    });
};

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
