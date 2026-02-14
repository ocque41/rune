"use client";

import { Suspense } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";

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
      <div className="absolute top-4 left-4 z-50">
        <Link
          href="/"
          className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-xs font-medium text-muted-foreground backdrop-blur-sm transition-colors hover:bg-black/60 hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Workflows
        </Link>
      </div>
      <Suspense fallback={<div className="flex h-full items-center justify-center text-muted-foreground">Loading editor workflow...</div>}>
        <FlowBuilderWithParams />
      </Suspense>
    </div>
  );
}
