"use client";

import React from "react";
import { WorkflowItem } from "@/lib/workflows.data";

type WheelHudProps = {
  active: WorkflowItem;
};

export function WheelHud({ active }: WheelHudProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/60 p-6 backdrop-blur">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-white/50">Active Workflow</p>
          <h2 className="text-2xl font-semibold text-white">{active.name}</h2>
        </div>
        <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/5 text-xl font-bold text-white">
          {active.grade}
        </div>
      </div>
      <p className="mt-4 text-sm text-white/60">{active.summary}</p>
      <div className="mt-6 grid grid-cols-3 gap-4">
        {active.metrics.map((metric) => (
          <div key={metric.label} className="rounded-xl border border-white/10 bg-white/5 p-3 text-center">
            <p className="text-[10px] uppercase tracking-[0.25em] text-white/40">
              {metric.label}
            </p>
            <p className="mt-1 text-lg font-semibold text-white">{metric.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
