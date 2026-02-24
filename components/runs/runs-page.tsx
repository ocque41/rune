"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import { AppHeader } from "@/components/app-shell/app-header";

const RunList = dynamic(
  () => import("@/components/run-list").then((mod) => mod.RunList),
  { ssr: false }
);

const RunDetails = dynamic(
  () => import("@/components/run-details").then((mod) => mod.RunDetails),
  { ssr: false }
);

export function RunsPage() {
  const [selectedRunId, setSelectedRunId] = useState<string | undefined>();

  return (
    <div className="flex min-h-screen w-full flex-col bg-background text-foreground">
      <AppHeader />
      <main className="flex flex-1 flex-col px-8 py-8">
        <div className="min-h-[720px] overflow-hidden rounded-2xl border border-white/10 bg-black/40">
          <div className="flex h-full">
            <div className="w-80 border-r border-white/10">
              <RunList onSelectRun={setSelectedRunId} selectedRunId={selectedRunId} />
            </div>
            <div className="flex flex-1 items-center justify-center">
              {selectedRunId ? (
                <RunDetails runId={selectedRunId} />
              ) : (
                <div className="text-sm text-white/50">
                  Select a run to view details
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
