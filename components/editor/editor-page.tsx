"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { AppHeader } from "@/components/app-shell/app-header";

const FlowBuilder = dynamic(
  () => import("@/components/flow-builder").then((mod) => mod.FlowBuilder),
  { ssr: false }
);

function FlowBuilderWithParams() {
  const searchParams = useSearchParams();
  const workflowId = searchParams.get("workflowId") || undefined;

  return <FlowBuilder initialWorkflowId={workflowId} />;
}

export function EditorPage() {
  return (
    <div className="flex min-h-screen w-full flex-col bg-background text-foreground">
      <AppHeader />
      <main className="flex flex-1 flex-col px-8 py-8">
        <div className="min-h-[720px] overflow-hidden rounded-2xl border border-white/10 bg-black/40">
          <Suspense fallback={<div className="flex h-full items-center justify-center text-muted-foreground p-8">Loading editor workflow...</div>}>
            <FlowBuilderWithParams />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
