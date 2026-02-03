'use client';

import React from "react";
import { AppHeader } from "@/components/app-shell/app-header";
import { WorkflowPicker } from "@/components/workflow-picker/workflow-picker";

export default function Home() {
  return (
    <div className="flex min-h-screen w-full flex-col bg-background text-foreground">
      <AppHeader />
      <WorkflowPicker />
    </div>
  );
}
