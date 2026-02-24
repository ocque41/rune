'use client';

import React, { useMemo, useState } from 'react';
import type { DragEvent } from 'react';
import { cn } from '@/lib/utils';
import { inferKindFromLegacyLabel } from '@/lib/workflow/node-catalog';

interface SidebarProps {
    hasStartNode: boolean;
    workflowId?: string | null;
    onAgentClick?: () => void;
    className?: string;
}

const NODE_GROUPS = {
    operations: [
        { type: 'step', label: 'Send Email' },
        { type: 'step', label: 'HTTP Request' },
        { type: 'step', label: 'Database Query' },
        { type: 'step', label: 'Run Script' },
        { type: 'step', label: 'Slack Message' },
        { type: 'step', label: 'Stream' },
        { type: 'batchProcess', label: 'Batch Process' },
        { type: 'customCode', label: 'Custom Code' },
        { type: 'dataValidation', label: 'Data Validation' },
    ],
    flow: [
        { type: 'step', label: 'Start Workflow' },
        { type: 'webhook', label: 'Webhook' },
        { type: 'schedule', label: 'Schedule' },
        { type: 'step', label: 'Sleep' },
        { type: 'step', label: 'Wait' },
        { type: 'approval', label: 'Approval' },
        { type: 'if', label: 'If / Else' },
        { type: 'loop', label: 'Loop' },
        { type: 'parallel', label: 'Parallel' },
        { type: 'subWorkflow', label: 'Sub-Workflow' },
        { type: 'ai', label: 'AI Gen' },
        { type: 'transform', label: 'Transform' },
        { type: 'groupNode', label: 'Group' },
    ],
} as const;

export const Sidebar = ({ hasStartNode, workflowId, onAgentClick, className }: SidebarProps) => {
    const [searchTerm, setSearchTerm] = useState('');

    const onDragStart = (event: DragEvent, nodeType: string, label: string) => {
        if (!event.dataTransfer) return;
        event.dataTransfer.setData('application/reactflow', nodeType);
        event.dataTransfer.setData('application/reactflow/label', label);
        event.dataTransfer.setData('application/reactflow/kind', inferKindFromLegacyLabel(label, nodeType));
        event.dataTransfer.effectAllowed = 'move';
    };

    const allNodes = useMemo(
        () =>
            [...NODE_GROUPS.operations, ...NODE_GROUPS.flow].map((item) => ({
                ...item,
                disabled: item.label === 'Start Workflow' && hasStartNode,
            })),
        [hasStartNode]
    );

    const filteredNodes = useMemo(() => {
        const query = searchTerm.trim().toLowerCase();
        if (!query) return allNodes;
        return allNodes.filter((node) => node.label.toLowerCase().includes(query));
    }, [allNodes, searchTerm]);

    return (
        <aside
            className={cn(
                'w-[18rem] max-w-[calc(100vw-2rem)] rounded-2xl border border-white/10 bg-black/60 text-white shadow-2xl backdrop-blur-xl',
                className
            )}
        >
            <div className="border-b border-white/10 px-3 py-3">
                <p className="text-xs font-medium text-white/60">Node commands</p>
                <p className="mt-1 text-[11px] text-white/40">
                    {workflowId ? `Workflow ${workflowId.slice(0, 8)}` : 'Unsaved workflow'}
                </p>
                <div className="mt-3 flex gap-2">
                    <button
                        type="button"
                        className="rounded-md border border-white/20 bg-white/10 px-2.5 py-1.5 text-[11px] font-medium text-white/90"
                    >
                        Nodes
                    </button>
                    <button
                        type="button"
                        onClick={onAgentClick}
                        className="rounded-md border border-white/10 bg-black/40 px-2.5 py-1.5 text-[11px] font-medium text-white/70 transition-colors hover:border-white/20 hover:text-white"
                    >
                        Agent
                    </button>
                </div>
            </div>

            <div className="p-3">
                <input
                    type="text"
                    placeholder="Search nodes"
                    className="w-full rounded-md border border-white/10 bg-black/50 px-3 py-2 text-xs text-white placeholder:text-white/40 focus:border-white/30 focus:outline-none"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    aria-label="Search nodes"
                />
            </div>

            <div className="max-h-[55vh] overflow-y-auto px-2 pb-3">
                {searchTerm ? (
                    <div className="space-y-1">
                        {filteredNodes.map((node) => (
                            <SidebarNodeCommand key={`${node.type}-${node.label}`} item={node} onDragStart={onDragStart} />
                        ))}
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div>
                            <p className="px-2 text-[10px] font-medium text-white/35">Operations</p>
                            <div className="mt-2 space-y-1">
                                {NODE_GROUPS.operations.map((node) => (
                                    <SidebarNodeCommand key={`${node.type}-${node.label}`} item={node} onDragStart={onDragStart} />
                                ))}
                            </div>
                        </div>
                        <div>
                            <p className="px-2 text-[10px] font-medium text-white/35">Flow control</p>
                            <div className="mt-2 space-y-1">
                                {NODE_GROUPS.flow.map((node) => (
                                    <SidebarNodeCommand
                                        key={`${node.type}-${node.label}`}
                                        item={{
                                            ...node,
                                            disabled: node.label === 'Start Workflow' && hasStartNode,
                                        }}
                                        onDragStart={onDragStart}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </aside>
    );
};

const SidebarNodeCommand = ({
    item,
    onDragStart,
}: {
    item: { type: string; label: string; disabled?: boolean };
    onDragStart: (event: DragEvent, nodeType: string, label: string) => void;
}) => {
    const isDisabled = Boolean(item.disabled);

    return (
        <div
            className={cn(
                'w-full rounded-lg border px-3 py-2 text-left text-xs transition-colors',
                isDisabled
                    ? 'cursor-not-allowed border-white/5 bg-white/[0.04] text-white/30'
                    : 'cursor-grab border-white/10 bg-black/30 text-white/80 hover:border-white/25 hover:bg-black/50 hover:text-white active:cursor-grabbing'
            )}
            draggable={!isDisabled}
            onDragStart={(e) => !isDisabled && onDragStart(e, item.type, item.label)}
        >
            {item.label}
        </div>
    );
};
