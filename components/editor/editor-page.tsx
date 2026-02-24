"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";

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
    <div className="relative h-screen w-screen overflow-hidden bg-background text-foreground">
      <Suspense fallback={<div className="flex h-full items-center justify-center text-muted-foreground">Loading editor workflow...</div>}>
        <FlowBuilderWithParams />
      </Suspense>
    </div>
  );
}
