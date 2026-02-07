'use client';

import React, { useState, useEffect } from 'react';
import type { DragEvent } from 'react';
import { MessageSquare, Mail, Database, Globe, Clock, Code, PauseCircle, Split, Repeat, Lock, GitMerge, Workflow, Info, ChevronDown, UserCheck, Sparkles, Box, Play, Layers, Bot, CheckSquare, Group } from 'lucide-react';
// import { AutoPilotContainer } from '@/components/playground/auto-pilot-container'; // Removed
import { LLMConfig } from '@/lib/types/agent';
import { cn } from '@/lib/utils';

interface SidebarProps {
    hasStartNode: boolean;
    workflowId?: string | null;
}

export const Sidebar = ({ hasStartNode, workflowId, onAgentClick }: { hasStartNode: boolean; workflowId?: string | null; onAgentClick?: () => void }) => {
    const [searchTerm, setSearchTerm] = useState(''); // New state for search term

    const onDragStart = (event: DragEvent, nodeType: string, label: string) => {
        // ... (existing implementation)
        if (event.dataTransfer) {
            event.dataTransfer.setData('application/reactflow', nodeType);
            event.dataTransfer.setData('application/reactflow/label', label);
            event.dataTransfer.effectAllowed = 'move';
        }
    };
    const steps = [
        { type: 'step', label: 'Send Email', icon: Mail },
        { type: 'step', label: 'HTTP Request', icon: Globe },
        { type: 'step', label: 'Database Query', icon: Database },
        { type: 'step', label: 'Run Script', icon: Code },
        { type: 'step', label: 'Slack Message', icon: MessageSquare },
        { type: 'step', label: 'Stream', icon: MessageSquare },
    ];

    const controlFlow = [
        // Start Workflow can only be added if one doesn't exist
        { type: 'step', label: 'Start Workflow', icon: Play, disabled: hasStartNode },
        { type: 'webhook', label: 'Webhook', icon: Globe },
        { type: 'schedule', label: 'Schedule', icon: Clock },
        { type: 'step', label: 'Sleep', icon: Clock },
        { type: 'step', label: 'Wait', icon: PauseCircle },
        { type: 'approval', label: 'Approval', icon: UserCheck },
        { type: 'if', label: 'If / Else', icon: Split },
        { type: 'loop', label: 'Loop', icon: Repeat },
        { type: 'parallel', label: 'Parallel', icon: GitMerge },
        { type: 'subWorkflow', label: 'Sub-Workflow', icon: Workflow },
        { type: 'ai', label: 'AI Gen', icon: Sparkles },
        { type: 'transform', label: 'Transform', icon: Code },
    ];
    // Combine all draggable nodes
    const allDraggableNodes = [
        ...steps,
        ...controlFlow,
        { type: 'batchProcess', label: 'Batch Process', icon: Box },
        { type: 'customCode', label: 'Custom Code', icon: Code },
        { type: 'dataValidation', label: 'Data Validation', icon: CheckSquare },
        { type: 'groupNode', label: 'Group', icon: Group },
    ];

    const filteredNodes = searchTerm
        ? allDraggableNodes.filter(node =>
              node.label.toLowerCase().includes(searchTerm.toLowerCase())
          )
        : allDraggableNodes; // If no search term, show all
    return (
        <aside
            className="h-full w-56 border-r flex flex-col z-20 transition-all duration-300 bg-background border-border"
        >
            {/* Tab Switcher - Modified for Agent Trigger */}
            <div className="flex p-2 gap-1 border-b border-border">
                <div

                    className={cn(
                        "flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-xs font-medium transition-all bg-secondary text-primary shadow-sm"
                    )}
                >
                    <Layers size={14} />
                    <span>Steps</span>
                </div>
                <button
                    onClick={onAgentClick}
                    className={cn(
                        "flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-xs font-medium transition-all",
                        "text-muted-foreground hover:text-foreground hover:bg-muted border border-transparent hover:border-border"
                    )}
                >
                    <Bot size={14} />
                    <span>Agent</span>
                </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col">
                <div className="p-2 animate-in fade-in slide-in-from-left-4 duration-300">
                    <input
                        type="text"
                        placeholder="Search nodes..."
                        className="w-full rounded-md bg-[#222222] border-none px-3 py-2 text-sm font-mono text-white placeholder-white/50 focus:outline-none focus:ring-1 focus:ring-blue-500 mb-4"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        aria-label="Search nodes"
                    />
                    {searchTerm ? (
                        <div className="flex flex-col gap-1">
                            <span className="text-[9px] uppercase tracking-wider text-white/30 mb-2 px-1 font-mono">Search Results</span>
                            <div className="grid grid-cols-1 gap-1">
                                {filteredNodes.map((node) => (
                                    <SidebarIconButton
                                        key={node.type + node.label}
                                        item={node}
                                        onDragStart={onDragStart}
                                    />
                                ))}
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Workflow Steps */}
                            <div className="flex flex-col gap-1 mb-4">
                                <span className="text-[9px] uppercase tracking-wider text-white/30 mb-2 px-1 font-mono">Operations</span>
                                <div className="grid grid-cols-1 gap-1">
                                    {steps.map((step) => (
                                        <SidebarIconButton
                                            key={step.label}
                                            item={step}
                                            onDragStart={onDragStart}
                                        />
                                    ))}
                                </div>
                            </div>

                            {/* Divider */}
                            <div className="w-8 h-px bg-white/10 my-4" />

                            {/* Control Flow */}
                            <div className="flex flex-col gap-1">
                                <span className="text-[9px] uppercase tracking-wider text-white/30 mb-2 px-1 font-mono">Control Flow</span>
                                <div className="grid grid-cols-1 gap-1">
                                    {controlFlow.map((control) => (
                                        <SidebarIconButton
                                            key={control.label}
                                            item={control}
                                            onDragStart={onDragStart}
                                        />
                                    ))}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </aside>
    );
};

// Compact button component with label
const SidebarIconButton = ({ item, onDragStart }: { item: any, onDragStart: any }) => {
    const isDisabled = item.disabled;

    return (
        <div
            className={`w-full flex items-center gap-3 px-3 py-2 transition-all text-xs font-medium truncate rounded-[6px] border border-transparent group
                ${isDisabled
                    ? 'opacity-40 cursor-not-allowed bg-[#222222]/50 text-white/50'
                    : 'cursor-grab active:cursor-grabbing hover:bg-white/5 hover:border-white/10 text-zinc-400 hover:text-zinc-100'
                }`}
            draggable={!isDisabled}
            onDragStart={(e) => !isDisabled && onDragStart(e, item.type, item.label)}
        >
            <item.icon size={15} className={`shrink-0 transition-colors ${!isDisabled && 'group-hover:text-[var(--neon-green)]'}`} />
            <span>{item.label}</span>
        </div>
    );
};

