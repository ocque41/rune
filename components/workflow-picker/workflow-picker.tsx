"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { WorkflowWheel } from "@/components/workflow-wheel/wheel";
import { WheelHud } from "@/components/workflow-wheel/wheel-hud";
import { WorkflowItem, workflowFallbacks } from "@/lib/workflows.data";
import { toast } from "sonner";

export function WorkflowPicker() {
  const router = useRouter();
  const [activeIndex, setActiveIndex] = useState(0);
  const [workflowItems, setWorkflowItems] = useState<WorkflowItem[]>(workflowFallbacks);
  const [isLoadingWorkflows, setIsLoadingWorkflows] = useState(false);

  const activeWorkflow = useMemo(() => {
    if (!workflowItems.length) return workflowFallbacks[0];
    return workflowItems[Math.min(activeIndex, workflowItems.length - 1)];
  }, [workflowItems, activeIndex]);

  useEffect(() => {
    let isMounted = true;
    const fetchWorkflows = async () => {
      setIsLoadingWorkflows(true);
      try {
        const res = await fetch("/api/rune/workflows/summary");
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to load workflows");
        if (!isMounted) return;
        const items = (data.workflows || []) as WorkflowItem[];
        setWorkflowItems(items.length ? items : workflowFallbacks);
        setActiveIndex(0);
      } catch (error) {
        console.error("Workflow summary fetch error:", error);
        if (isMounted) setWorkflowItems(workflowFallbacks);
      } finally {
        if (isMounted) setIsLoadingWorkflows(false);
      }
    };

    fetchWorkflows();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSelect = (index: number) => {
    setActiveIndex(index);
    if (workflowItems[index]?.name) {
      toast.success(`Locked ${workflowItems[index]?.name}`);
    }
  };

  const handleOpenEditor = (index: number) => {
    const workflowId = workflowItems[index]?.id;
    if (!workflowId || workflowId === "placeholder-workflow") return;
    router.push(`/editor?workflowId=${workflowId}`);
  };

  return (
    <main className="flex flex-1 flex-col gap-10 px-10 py-10">
      <section className="grid grid-cols-[1.25fr_0.75fr] gap-10">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-8">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-white/40">Selection Engine</p>
              <h2 className="text-2xl font-semibold text-white">Workflow Wheel</h2>
            </div>
            <div className="rounded-full border border-white/10 bg-black/40 px-4 py-2 text-xs uppercase tracking-[0.3em] text-white/60">
              {isLoadingWorkflows ? "Loading workflows" : `Active ${activeWorkflow.name}`}
            </div>
          </div>
          <WorkflowWheel
            workflows={workflowItems}
            activeIndex={activeIndex}
            onSelect={handleSelect}
            onItemClick={handleOpenEditor}
          />
        </div>

        <div className="flex flex-col gap-6">
          <WheelHud active={activeWorkflow} />
          <div className="rounded-2xl border border-white/10 bg-black/60 p-6 backdrop-blur">
            <p className="text-xs uppercase tracking-[0.3em] text-white/40">System Notes</p>
            <h3 className="mt-2 text-lg font-semibold text-white">Stability First</h3>
            <ul className="mt-4 space-y-2 text-sm text-white/60">
              <li>Transform-only animation pipeline for 60fps target.</li>
              <li>Reduced-motion fallback renders static wheel layout.</li>
              <li>Error boundaries isolate animation subsystems.</li>
              <li>Vercel-safe: no long-running server tasks.</li>
            </ul>
          </div>
        </div>
      </section>
    </main>
  );
}
