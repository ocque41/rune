'use client';
import React from 'react';


import { FlowBuilder } from "@/components/flow-builder";
import { RunList } from "@/components/run-list";
import { RunDetails } from "@/components/run-details";
import { WorkflowList } from "@/components/workflow-list"; // Import
import Link from "next/link";
import { BookOpen, Layout, Activity, FolderGit2 } from "lucide-react"; // Add Folder icon
import { useState } from "react";
import { toast } from 'sonner';

export default function Home() {
  const [activeTab, setActiveTab] = useState<'editor' | 'runs' | 'workflows'>('editor'); // Add 'workflows'
  const [selectedRunId, setSelectedRunId] = useState<string | undefined>();

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
                ? 'bg-white dark:bg-black shadow-sm'
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
                ? 'bg-white dark:bg-black shadow-sm'
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
                ? 'bg-white dark:bg-black shadow-sm'
                : 'hover:bg-black/5 dark:hover:bg-white/5 opacity-60 hover:opacity-100'
                }`}
              style={{
                color: activeTab === 'runs' ? 'var(--foreground-title)' : 'var(--foreground-subtitle)'
              }}
            >
              <Activity size={14} />
              Runs
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
          <FlowBuilder />
        ) : activeTab === 'workflows' ? (
          <WorkflowList onSelectWorkflow={(id, type) => {
            // TODO: Implement loading workflow into editor
            toast.info(`Selected ${type} workflow: ${id}`);
            // In future: setNodes/Edges and switch to editor
          }} />
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

