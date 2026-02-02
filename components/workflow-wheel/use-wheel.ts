"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import anime from "animejs";
import { motionTokens } from "@/lib/motion.config";
import { useReducedMotion } from "@/hooks/use-reduced-motion";

export type WheelState = {
  index: number;
  angle: number;
};

type UseWheelOptions = {
  count: number;
  onSelect?: (index: number) => void;
};

export function useWheel({ count, onSelect }: UseWheelOptions) {
  const reducedMotion = useReducedMotion();
  const ringRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<Array<HTMLDivElement | null>>([]);
  const [state, setState] = useState<WheelState>({ index: 0, angle: 0 });
  const dragging = useRef(false);
  const lastX = useRef(0);
  const velocity = useRef(0);

  const step = useMemo(() => (count ? 360 / count : 0), [count]);

  useEffect(() => {
    if (!count) return;
    const radius = motionTokens.wheel.radius;
    itemRefs.current.forEach((el, i) => {
      if (!el) return;
      const angle = i * step;
      el.dataset.angle = String(angle);
      el.style.transform = `rotateY(${angle}deg) translateZ(${radius}px)`;
    });
  }, [count, step]);

  const snapToIndex = (index: number) => {
    const normalized = ((index % count) + count) % count;
    const angle = -normalized * step;
    setState({ index: normalized, angle });
    onSelect?.(normalized);

    if (!ringRef.current) return;
    if (reducedMotion) {
      ringRef.current.style.transform = `rotateY(${angle}deg)`;
      return;
    }

    anime.remove(ringRef.current);
    anime({
      targets: ringRef.current,
      rotateY: angle,
      duration: motionTokens.durations.long,
      easing: "spring(1, 80, 10, 0)"
    });
  };

  const onPointerDown = (event: React.PointerEvent) => {
    if (!ringRef.current) return;
    dragging.current = true;
    lastX.current = event.clientX;
    velocity.current = 0;
    ringRef.current.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: React.PointerEvent) => {
    if (!dragging.current || !ringRef.current) return;
    const deltaX = event.clientX - lastX.current;
    lastX.current = event.clientX;
    velocity.current = deltaX;
    const nextAngle = state.angle + deltaX * motionTokens.wheel.dragSensitivity;
    setState((prev) => ({ ...prev, angle: nextAngle }));
    ringRef.current.style.transform = `rotateY(${nextAngle}deg)`;
  };

  const onPointerUp = () => {
    if (!dragging.current) return;
    dragging.current = false;

    const momentum = velocity.current * 4;
    const projectedAngle = state.angle + momentum;
    const rawIndex = Math.round(-projectedAngle / step);
    snapToIndex(rawIndex);
  };

  return {
    ringRef,
    itemRefs,
    state,
    snapToIndex,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerLeave: onPointerUp,
      onPointerCancel: onPointerUp
    }
  };
}
