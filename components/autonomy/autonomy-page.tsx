"use client";

import React from "react";
import dynamic from "next/dynamic";
import { AppHeader } from "@/components/app-shell/app-header";

const AutonomyDashboard = dynamic(
  () => import("@/components/autonomy/autonomy-dashboard").then((mod) => mod.AutonomyDashboard),
  { ssr: false }
);

export function AutonomyPage() {
  return (
    <div className="flex min-h-screen w-full flex-col bg-background text-foreground">
      <AppHeader />
      <main className="flex flex-1 flex-col px-10 py-10">
        <div className="min-h-[720px] overflow-hidden rounded-2xl border border-white/10 bg-black/40">
          <AutonomyDashboard />
        </div>
      </main>
    </div>
  );
}
