"use client";

import React from "react";
import { WorkflowItem } from "@/lib/workflows.data";
import { useWheel } from "@/components/workflow-wheel/use-wheel";
import { WheelItem } from "@/components/workflow-wheel/wheel-item";

type WheelProps = {
  workflows: WorkflowItem[];
  activeIndex: number;
  onSelect: (index: number) => void;
  onItemClick?: (index: number) => void;
};

export function WorkflowWheel({ workflows, activeIndex, onSelect, onItemClick }: WheelProps) {
  const { ringRef, itemRefs, handlers } = useWheel({
    count: workflows.length,
    onSelect
  });

  return (
    <div className="relative flex h-[520px] w-full items-center justify-center">
      <div
        className="relative h-full w-full [perspective:1200px]"
        {...handlers}
      >
        <div
          ref={ringRef}
          className="absolute left-1/2 top-1/2 h-full w-full -translate-x-1/2 -translate-y-1/2 [transform-style:preserve-3d]"
        >
          {workflows.map((item, index) => (
            <WheelItem
              key={item.id}
              item={item}
              index={index}
              active={index === activeIndex}
              setRef={(node) => {
                itemRefs.current[index] = node;
              }}
              onClick={onItemClick}
            />
          ))}
        </div>
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-10 flex items-center justify-center">
        <div className="rounded-full border border-white/10 bg-black/40 px-4 py-2 text-xs uppercase tracking-[0.3em] text-white/60">
          Drag to rotate · Release to snap
        </div>
      </div>
    </div>
  );
}
