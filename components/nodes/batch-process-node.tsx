'use client';

import React, { useState } from 'react';
import { Handle, Position, NodeProps, Node } from '@xyflow/react';
import { Package, Settings } from 'lucide-react';

export type BatchProcessNodeData = {
    label: string;
    items?: string; // e.g., 'params.data.list'
    workflowId?: string; // ID of the sub-workflow to execute for each item
    concurrency?: number; // How many items to process in parallel
    outputAggregation?: 'array' | 'object' | 'sum' | 'none'; // How to combine results
    status?: 'idle' | 'running' | 'completed' | 'failed' | 'success' | 'failure';
};

export type CustomBatchProcessNode = Node<BatchProcessNodeData>;

const MOCKED_WORKFLOWS = [
    { id: 'processSingleItem', label: 'Process Single Item' },
    { id: 'dataValidation', label: 'Validate Data' },
    { id: 'enrichRecord', label: 'Enrich Record' },
];

const BatchProcessNode = ({ data, selected }: NodeProps<CustomBatchProcessNode>) => {
    const [showConfig, setShowConfig] = useState(false);
    const [items, setItems] = useState(data.items || 'params.data.list');
    const [workflowId, setWorkflowId] = useState(data.workflowId || 'processSingleItem');
    const [concurrency, setConcurrency] = useState(data.concurrency || 1);
    const [outputAggregation, setOutputAggregation] = useState(data.outputAggregation || 'array');

    return (
        <div
            className={`min-w-[280px] rounded-xl border-2 transition-all ${selected ? 'border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.3)]' : 'border-white/10 hover:border-white/20'}`}
            style={{
                backgroundColor: '#111111',
                backdropFilter: 'blur(10px)'
            }}
        >
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 bg-white/5">
                {/* Status Indicator */}
                {data.status && data.status !== 'idle' && (
                    <div className="absolute top-0 right-0 p-2">
                        <div className={`h-3 w-3 rounded-full shadow-lg ${data.status === 'running' ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)] animate-pulse' :
                            (data.status === 'completed' || data.status === 'success') ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' :
                                (data.status === 'failed' || data.status === 'failure') ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' :
                                    'bg-white/30' // Default for unknown/idle
                            }`} />
                    </div>
                )}
                <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white/70 ring-1 ring-white/20">
                        <Package size={16} />
                    </div>
                    <span className="text-sm font-semibold text-white/90 tracking-wide">
                        Batch Process
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
                {showConfig && (
                    <div className="space-y-3">
                        <div>
                            <label className="mb-1 block text-xs font-medium text-white/50">Items Array Path</label>
                            <input
                                type="text"
                                placeholder="e.g. params.data.list"
                                className="w-full rounded-lg bg-[#222222] border-none px-2 py-1.5 text-xs font-mono text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-white/30"
                                value={items}
                                onChange={(e) => {
                                    setItems(e.target.value);
                                    data.items = e.target.value;
                                }}
                            />
                            <p className="mt-1 text-[10px] text-white/50">Path to the array of items to process (e.g., from previous node's output).</p>
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-medium text-white/50">Sub-Workflow for Each Item</label>
                            <div className="space-y-2">
                                <input
                                    type="text"
                                    className="w-full rounded-lg bg-[#222222] border-none px-2 py-1.5 text-xs font-mono text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-white/30"
                                    value={workflowId}
                                    onChange={(e) => {
                                        setWorkflowId(e.target.value);
                                        data.workflowId = e.target.value;
                                    }}
                                    placeholder="e.g. processSingleItem"
                                />
                                <div className="flex flex-wrap gap-1">
                                    {MOCKED_WORKFLOWS.map(wf => (
                                        <button
                                            key={wf.id}
                                            onClick={() => {
                                                setWorkflowId(wf.id);
                                                data.workflowId = wf.id;
                                            }}
                                            className="rounded border px-1.5 py-0.5 text-[10px] opacity-60 hover:opacity-100"
                                            style={{ borderColor: 'var(--border-color)' }}
                                        >
                                            {wf.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <p className="mt-1 text-[10px] text-white/50">The ID of the sub-workflow to execute for each item.</p>
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-medium text-white/50">Concurrency</label>
                            <input
                                type="number"
                                min="1"
                                placeholder="e.g. 1"
                                className="w-full rounded-lg bg-[#222222] border-none px-2 py-1.5 text-xs font-mono text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-white/30"
                                value={concurrency}
                                onChange={(e) => {
                                    const val = parseInt(e.target.value, 10);
                                    setConcurrency(isNaN(val) ? 1 : val);
                                    data.concurrency = isNaN(val) ? 1 : val;
                                }}
                            />
                            <p className="mt-1 text-[10px] text-white/50">Number of items to process in parallel (1 for sequential).</p>
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-medium text-white/50">Output Aggregation</label>
                            <select
                                className="w-full rounded-lg bg-[#222222] border-none px-2 py-1.5 text-xs font-mono text-white focus:outline-none focus:ring-1 focus:ring-white/30"
                                value={outputAggregation}
                                onChange={(e) => {
                                    const val = e.target.value as BatchProcessNodeData['outputAggregation'];
                                    setOutputAggregation(val);
                                    data.outputAggregation = val;
                                }}
                            >
                                <option value="array">Array (default)</option>
                                <option value="object">Object (merge all results)</option>
                                <option value="sum">Sum (for numeric results)</option>
                                <option value="none">None (discard individual results)</option>
                            </select>
                            <p className="mt-1 text-[10px] text-white/50">How to combine the results from each processed item.</p>
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

            <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center">
                <span className="mb-1 text-[10px] font-medium text-white/50">Done</span>
                <Handle
                    type="source"
                    position={Position.Bottom}
                    id="done"
                    className="!h-3 !w-3 !bg-gray-500 !border-2"
                    style={{ borderColor: '#131313' }}
                />
            </div>
        </div>
    );
};

export default BatchProcessNode;