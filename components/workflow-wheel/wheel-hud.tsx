"use client";

import React from "react";
import { WorkflowItem } from "@/lib/workflows.data";

type WheelHudProps = {
  active: WorkflowItem;
};

export function WheelHud({ active }: WheelHudProps) {
  return (
    <div className="rounded-2xl border border-white/12 bg-[color:var(--metric-surface-1)] p-5 backdrop-blur">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.28em] text-white/50">Active Workflow</p>
          <h2 className="text-xl font-semibold text-white">{active.name}</h2>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/14 bg-[color:var(--metric-surface-2)] text-lg font-bold text-white" title="Workflow grade">
          {active.grade}
        </div>
      </div>
      <p className="mt-3 text-xs text-white/60">{active.summary}</p>
      <div className="mt-4 grid grid-cols-3 gap-3">
        {active.metrics.map((metric) => (
          <div key={metric.label} className="rounded-xl border border-white/12 bg-[color:var(--metric-surface-2)] p-2.5 text-center" title={`${metric.label}: ${metric.value}`}>
            <p className="text-[9px] uppercase tracking-[0.22em] text-white/40">
              {metric.label}
            </p>
            <p className="mt-1 text-sm font-semibold text-white">{metric.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
