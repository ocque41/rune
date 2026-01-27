'use client';
import React from 'react';


import dynamic from 'next/dynamic';

const FlowBuilder = dynamic(() => import("@/components/flow-builder").then(mod => mod.FlowBuilder), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-full opacity-50">Loading Editor...</div>
});

import { RunList } from "@/components/run-list";
import { RunDetails } from "@/components/run-details";

const WorkflowList = dynamic(() => import("@/components/workflow-list").then(mod => mod.WorkflowList), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-full opacity-50">Loading Workflows...</div>
});

const AutonomyDashboard = dynamic(() => import("@/components/autonomy/autonomy-dashboard").then(mod => mod.AutonomyDashboard), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-full opacity-50">Loading Autonomy...</div>
});

import Link from "next/link";
import { BookOpen, Layout, Activity, FolderGit2, Bot } from "lucide-react"; // Add Bot icon
import { useState } from "react";
import { toast } from 'sonner';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'editor' | 'runs' | 'workflows' | 'autonomy'>('editor'); // Add 'autonomy'
  const [selectedRunId, setSelectedRunId] = useState<string | undefined>();
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | undefined>();

  return (
    <div className="flex h-screen w-full flex-col" style={{ backgroundColor: 'var(--background)' }}>
      <header className="flex h-16 items-center justify-between border-b px-6" style={{
        borderColor: 'var(--border-color)',
        backgroundColor: 'var(--header-background)'
      }}>
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full" style={{
              backgroundColor: 'var(--foreground-title)',
              opacity: 0.8
            }}></div>
            <span className="text-lg font-bold" style={{
              color: 'var(--foreground-title)',
              letterSpacing: '-0.05em'
            }}>CUMULUS</span>
          </div>

          <div className="flex items-center gap-1 bg-black/5 dark:bg-white/5 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('editor')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'editor'
                ? 'border border-white/20'
                : 'hover:bg-black/5 dark:hover:bg-white/5 opacity-60 hover:opacity-100'
                }`}
              style={{
                color: activeTab === 'editor' ? 'var(--foreground-title)' : 'var(--foreground-subtitle)'
              }}
            >
              <Layout size={14} />
              Editor
            </button>
            <button
              onClick={() => setActiveTab('workflows')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'workflows'
                ? 'border border-white/20'
                : 'hover:bg-black/5 dark:hover:bg-white/5 opacity-60 hover:opacity-100'
                }`}
              style={{
                color: activeTab === 'workflows' ? 'var(--foreground-title)' : 'var(--foreground-subtitle)'
              }}
            >
              <FolderGit2 size={14} />
              Workflows
            </button>
            <button
              onClick={() => setActiveTab('runs')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'runs'
                ? 'border border-white/20'
                : 'hover:bg-black/5 dark:hover:bg-white/5 opacity-60 hover:opacity-100'
                }`}
              style={{
                color: activeTab === 'runs' ? 'var(--foreground-title)' : 'var(--foreground-subtitle)'
              }}
            >
              <Activity size={14} />
              Runs
            </button>
            <button
              onClick={() => setActiveTab('autonomy')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === 'autonomy'
                ? 'border border-white/20'
                : 'hover:bg-black/5 dark:hover:bg-white/5 opacity-60 hover:opacity-100'
                }`}
              style={{
                color: activeTab === 'autonomy' ? 'var(--foreground-title)' : 'var(--foreground-subtitle)'
              }}
            >
              <Bot size={14} />
              Autonomy
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Link
            href="/docs"
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors hover:opacity-100"
            style={{
              color: 'var(--foreground-subtitle)',
              letterSpacing: '-0.02em',
              opacity: 0.8
            }}
          >
            <BookOpen className="h-4 w-4" />
            Documentation
          </Link>
          {activeTab === 'editor' && (
            <></>
          )}
        </div>
      </header>
      <main className="flex-1 overflow-hidden">
        {activeTab === 'editor' ? (
          <FlowBuilder initialWorkflowId={selectedWorkflowId} />
        ) : activeTab === 'workflows' ? (
          <WorkflowList onSelectWorkflow={(id, type) => {
            setSelectedWorkflowId(id);
            setActiveTab('editor');
            toast.success(`Loading workflow...`);
          }} />
        ) : activeTab === 'autonomy' ? (
          <AutonomyDashboard />
        ) : (
          <div className="flex h-full">
            <div className="w-80 h-full">
              <RunList
                onSelectRun={setSelectedRunId}
                selectedRunId={selectedRunId}
              />
            </div>
            <div className="flex-1 h-full bg-black/5 dark:bg-white/5">
              {selectedRunId ? (
                <RunDetails runId={selectedRunId} />
              ) : (
                <div className="flex items-center justify-center h-full text-sm opacity-50">
                  Select a run to view details
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

