'use client';

import React, { useState } from 'react';
import { Handle, Position, NodeProps, Node } from '@xyflow/react';
import { Workflow, Settings } from 'lucide-react';

export type SubWorkflowNodeData = {
    label: string;
    workflowId?: string;
    params?: string;
};

export type CustomSubWorkflowNode = Node<SubWorkflowNodeData>;

const MOCKED_WORKFLOWS = [
    { id: 'leadQualification', label: 'Lead Qualification' },
    { id: 'processInvoice', label: 'Invoice Processing' },
    { id: 'onboardUser', label: 'User Onboarding' },
];

const SubWorkflowNode = ({ data, selected }: NodeProps<CustomSubWorkflowNode>) => {
    const [showConfig, setShowConfig] = useState(false);
    const [workflowId, setWorkflowId] = useState(data.workflowId || 'leadQualification');
    const [params, setParams] = useState(data.params || '{}');

    return (
        <div
            className={`min-w-[240px] rounded-lg border shadow-sm transition-all ${selected ? 'ring-2 ring-blue-500/20' : ''}`}
            style={{
                backgroundColor: 'var(--node-background)',
                borderColor: selected ? '#3b82f6' : 'rgba(17, 17, 17, 0.1)'
            }}
        >
            <div className="flex items-center justify-between border-b px-3 py-2" style={{
                backgroundColor: 'var(--accent-bg)',
                borderColor: 'var(--border-color)'
            }}>
                <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded" style={{
                        backgroundColor: 'var(--accent-bg)',
                        color: 'var(--foreground-body)'
                    }}>
                        <Workflow size={12} />
                    </div>
                    <span className="text-sm font-medium" style={{ color: 'var(--foreground-body)' }}>
                        Sub-Workflow
                    </span>
                </div>
                <button
                    onClick={() => setShowConfig(!showConfig)}
                    className="rounded p-1 transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                >
                    <Settings size={14} className="opacity-60 hover:opacity-100" style={{ color: 'var(--foreground-body)' }} />
                </button>
            </div>

            <div className="p-3">
                <div className="mb-2">
                    <div className="text-xs font-medium mb-1" style={{ color: 'var(--foreground-body)' }}>
                        {MOCKED_WORKFLOWS.find(w => w.id === workflowId)?.label || 'Select Workflow'}
                    </div>
                    <div className="text-[10px] opacity-60 font-mono truncate" style={{ color: 'var(--foreground-body)' }}>
                        ID: {workflowId}
                    </div>
                </div>

                {showConfig && (
                    <div className="mt-3 space-y-3 rounded bg-black/5 p-2 dark:bg-white/5">
                        <div>
                            <label className="mb-1 block text-xs font-medium" style={{ color: 'var(--foreground-body)' }}>Workflow ID</label>
                            <div className="space-y-2">
                                <input
                                    type="text"
                                    className="w-full rounded border px-2 py-1 text-xs font-mono"
                                    style={{
                                        backgroundColor: 'var(--background)',
                                        borderColor: 'var(--border-color)',
                                        color: 'var(--foreground-body)'
                                    }}
                                    value={workflowId}
                                    onChange={(e) => {
                                        setWorkflowId(e.target.value);
                                        data.workflowId = e.target.value;
                                        data.label = e.target.value || 'Sub-Workflow';
                                    }}
                                    placeholder="e.g. leadQualification"
                                />
                                <div className="flex flex-wrap gap-1">
                                    {MOCKED_WORKFLOWS.map(wf => (
                                        <button
                                            key={wf.id}
                                            onClick={() => {
                                                setWorkflowId(wf.id);
                                                data.workflowId = wf.id;
                                                data.label = wf.label;
                                            }}
                                            className="rounded border px-1.5 py-0.5 text-[10px] opacity-60 hover:opacity-100"
                                            style={{ borderColor: 'var(--border-color)' }}
                                        >
                                            {wf.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-medium" style={{ color: 'var(--foreground-body)' }}>Parameters (JSON)</label>
                            <textarea
                                className="w-full rounded border px-2 py-1 text-xs font-mono"
                                style={{
                                    backgroundColor: 'var(--background)',
                                    borderColor: 'var(--border-color)',
                                    color: 'var(--foreground-body)',
                                    minHeight: '60px'
                                }}
                                value={params}
                                onChange={(e) => {
                                    setParams(e.target.value);
                                    data.params = e.target.value;
                                }}
                                placeholder='{"userId": "123"}'
                            />
                        </div>
                    </div>
                )}
            </div>

            <Handle
                type="target"
                position={Position.Top}
                className="!h-3 !w-3 !border-2 !transition-colors hover:!bg-blue-500"
                style={{
                    backgroundColor: 'var(--foreground)',
                    borderColor: 'var(--background)'
                }}
            />

            <Handle
                type="source"
                position={Position.Bottom}
                className="!h-3 !w-3 !border-2 !transition-colors hover:!bg-blue-500"
                style={{
                    backgroundColor: 'var(--foreground)',
                    borderColor: 'var(--background)'
                }}
            />
        </div>
    );
};

export default SubWorkflowNode;
