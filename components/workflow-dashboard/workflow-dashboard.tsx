"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import { WorkflowWheel } from "@/components/workflow-wheel/wheel";
import { WheelHud } from "@/components/workflow-wheel/wheel-hud";
import { workflows } from "@/lib/workflows.data";
import { cn } from "@/lib/utils";
import { Activity, Bot, FolderGit2, LayoutDashboard } from "lucide-react";
import { toast } from "sonner";

const FlowBuilder = dynamic(
  () => import("@/components/flow-builder").then((mod) => mod.FlowBuilder),
  { ssr: false }
);

const WorkflowList = dynamic(
  () => import("@/components/workflow-list").then((mod) => mod.WorkflowList),
  { ssr: false }
);

const RunList = dynamic(
  () => import("@/components/run-list").then((mod) => mod.RunList),
  { ssr: false }
);

const RunDetails = dynamic(
  () => import("@/components/run-details").then((mod) => mod.RunDetails),
  { ssr: false }
);

const AutonomyDashboard = dynamic(
  () => import("@/components/autonomy/autonomy-dashboard").then((mod) => mod.AutonomyDashboard),
  { ssr: false }
);

type ModuleKey = "editor" | "workflows" | "runs" | "autonomy";

const modules = [
  { key: "editor" as const, label: "Editor", icon: LayoutDashboard },
  { key: "workflows" as const, label: "Workflows", icon: FolderGit2 },
  { key: "runs" as const, label: "Runs", icon: Activity },
  { key: "autonomy" as const, label: "Autonomy", icon: Bot }
];

export function WorkflowDashboard() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [activeModule, setActiveModule] = useState<ModuleKey>("editor");
  const [selectedRunId, setSelectedRunId] = useState<string | undefined>();
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | undefined>();

  const activeWorkflow = workflows[activeIndex];

  return (
    <div className="flex min-h-screen w-full flex-col bg-background text-foreground">
      <header className="flex items-center justify-between border-b border-white/10 px-10 py-6">
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-sm font-semibold text-white">
            R
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-white/40">Rune</p>
            <h1 className="text-lg font-semibold text-white">Workflow Command Deck</h1>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {modules.map((item) => {
            const Icon = item.icon;
            const active = item.key === activeModule;
            return (
              <button
                key={item.key}
                onClick={() => setActiveModule(item.key)}
                className={cn(
                  "flex items-center gap-2 rounded-full border px-4 py-2 text-xs uppercase tracking-[0.3em] transition",
                  active
                    ? "border-white/30 bg-white/10 text-white"
                    : "border-white/10 text-white/50 hover:text-white"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </button>
            );
          })}
        </div>
      </header>

      <main className="flex flex-1 flex-col gap-10 px-10 py-10">
        <section className="grid grid-cols-[1.25fr_0.75fr] gap-10">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-white/40">Selection Engine</p>
                <h2 className="text-2xl font-semibold text-white">3D Workflow Wheel</h2>
              </div>
              <div className="rounded-full border border-white/10 bg-black/40 px-4 py-2 text-xs uppercase tracking-[0.3em] text-white/60">
                Active {activeWorkflow.name}
              </div>
            </div>
            <WorkflowWheel
              activeIndex={activeIndex}
              onSelect={(index) => {
                setActiveIndex(index);
                setSelectedWorkflowId(workflows[index]?.id);
                toast.success(`Locked ${workflows[index]?.name}`);
              }}
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

        <section className="rounded-3xl border border-white/10 bg-white/5 p-8">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-white/40">Operations Bay</p>
              <h2 className="text-2xl font-semibold text-white">Modules</h2>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/40 px-4 py-2 text-xs uppercase tracking-[0.3em] text-white/60">
              Mode {modules.find((m) => m.key === activeModule)?.label}
            </div>
          </div>

          <div className="min-h-[520px] overflow-hidden rounded-2xl border border-white/10 bg-black/40">
            {activeModule === "editor" && <FlowBuilder initialWorkflowId={selectedWorkflowId} />}
            {activeModule === "workflows" && (
              <WorkflowList
                onSelectWorkflow={(id) => {
                  setSelectedWorkflowId(id);
                  setActiveModule("editor");
                  toast.success("Loading workflow...");
                }}
              />
            )}
            {activeModule === "autonomy" && <AutonomyDashboard />}
            {activeModule === "runs" && (
              <div className="flex h-full">
                <div className="w-80 border-r border-white/10">
                  <RunList onSelectRun={setSelectedRunId} selectedRunId={selectedRunId} />
                </div>
                <div className="flex flex-1 items-center justify-center">
                  {selectedRunId ? (
                    <RunDetails runId={selectedRunId} />
                  ) : (
                    <div className="text-sm uppercase tracking-[0.3em] text-white/50">
                      Select a run to view details
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
