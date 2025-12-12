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
            className={`min-w-[240px] rounded-xl border-2 transition-all ${selected ? 'border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.3)]' : 'border-white/10 hover:border-white/20'}`}
            style={{
                backgroundColor: '#111111',
                backdropFilter: 'blur(10px)'
            }}
        >
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 bg-white/5">
                <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white/70 ring-1 ring-white/20">
                        <Workflow size={16} />
                    </div>
                    <span className="text-sm font-semibold text-white/90 tracking-wide">
                        Sub-Workflow
                    </span>
                </div>
                <button
                    onClick={() => setShowConfig(!showConfig)}
                    className="rounded p-1.5 transition-colors text-white/40 hover:text-white/80 hover:bg-white/5"
                >
                    <Settings size={16} />
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
                                    className="w-full rounded-lg bg-[#222222] border-none px-2 py-1.5 text-xs font-mono text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-white/30"
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
                                className="w-full rounded-lg bg-[#222222] border-none px-2 py-1.5 text-xs font-mono text-white placeholder-white/30 min-h-[60px] focus:outline-none focus:ring-1 focus:ring-white/30"
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
                className="!h-3 !w-3 !bg-[#F0EEE9] !border-2"
                style={{ borderColor: '#131313' }}
            />

            <Handle
                type="source"
                position={Position.Bottom}
                className="!h-3 !w-3 !bg-[#F0EEE9] !border-2"
                style={{ borderColor: '#131313' }}
            />
        </div>
    );
};

export default SubWorkflowNode;
