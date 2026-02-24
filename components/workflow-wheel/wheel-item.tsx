"use client";

import React from "react";
import { WorkflowItem } from "@/lib/workflows.data";
import { cn } from "@/lib/utils";

type WheelItemProps = {
  item: WorkflowItem;
  active: boolean;
  index: number;
  setRef: (node: HTMLDivElement | null) => void;
  onClick?: (index: number) => void;
};

export function WheelItem({ item, active, setRef, onClick, index }: WheelItemProps) {
  return (
    <div
      ref={setRef}
      onClick={() => onClick?.(index)}
      role="button"
      tabIndex={0}
      title={`Open ${item.name} in editor`}
      className={cn(
        "absolute left-1/2 top-1/2 h-40 w-56 -translate-x-1/2 -translate-y-1/2",
        "rounded-2xl border border-white/12 bg-[color:var(--metric-surface-2)] backdrop-blur",
        "p-3 transition-all duration-300",
        "cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40",
        active ? "scale-[1.03] shadow-[0_0_32px_rgba(170,170,170,0.2)]" : "opacity-70"
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.28em] text-white/50">Workflow</p>
          <h3 className="text-base font-semibold text-white">{item.name}</h3>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-[10px] uppercase tracking-[0.3em] text-white/40">Grade</span>
          <span className="text-2xl font-bold text-white">{item.grade}</span>
        </div>
      </div>
      <p className="mt-2 text-xs text-white/60">{item.summary}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {item.tags.map((tag) => (
          <span
            key={tag}
            className="rounded-full border border-white/10 px-2 py-0.5 text-[9px] uppercase tracking-[0.2em] text-white/50"
          >
            {tag}
          </span>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between">
        {item.metrics.map((metric) => (
          <div key={metric.label} className="text-center">
            <p className="text-[9px] uppercase tracking-[0.25em] text-white/40">
              {metric.label}
            </p>
            <p className="text-xs font-semibold text-white">{metric.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
