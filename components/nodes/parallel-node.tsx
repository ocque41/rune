'use client';

import React, { useState } from 'react';
import { Handle, Position, NodeProps, Node } from '@xyflow/react';
import { GitMerge, Settings, Plus, Minus } from 'lucide-react';

export type ParallelNodeData = {
    label: string;
    branches?: number;
    status?: 'idle' | 'running' | 'completed' | 'failed' | 'success' | 'failure';
};

export type CustomParallelNode = Node<ParallelNodeData>;

const ParallelNode = ({ data, selected }: NodeProps<CustomParallelNode>) => {
    const [showConfig, setShowConfig] = useState(false);
    const [branches, setBranches] = useState(data.branches || 2);

    const updateBranches = (count: number) => {
        const newCount = Math.max(2, Math.min(10, count));
        setBranches(newCount);
        data.branches = newCount;
    };

    return (
        <div
            className={`min-w-[240px] rounded-xl border-2 transition-all ${selected ? 'border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.3)]' : 'border-white/10 hover:border-white/20'}`}
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
                        <GitMerge size={16} className="rotate-90" />
                    </div>
                    <span className="text-sm font-semibold text-white/90 tracking-wide">
                        Parallel Execution
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
                    <div className="mb-3 rounded bg-black/5 p-2 dark:bg-white/5">
                        <label className="mb-2 block text-xs font-medium" style={{ color: 'var(--foreground-body)' }}>
                            Number of Branches
                        </label>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => updateBranches(branches - 1)}
                                className="flex h-6 w-6 items-center justify-center rounded border bg-white hover:bg-gray-50 dark:bg-black dark:hover:bg-gray-900"
                                style={{ borderColor: 'var(--border-color)' }}
                            >
                                <Minus size={12} />
                            </button>
                            <span className="min-w-[20px] text-center text-sm font-medium">{branches}</span>
                            <button
                                onClick={() => updateBranches(branches + 1)}
                                className="flex h-6 w-6 items-center justify-center rounded border bg-white hover:bg-gray-50 dark:bg-black dark:hover:bg-gray-900"
                                style={{ borderColor: 'var(--border-color)' }}
                            >
                                <Plus size={12} />
                            </button>
                        </div>
                    </div>
                )}

                <div className="text-xs opacity-60" style={{ color: 'var(--foreground-body)' }}>
                    Runs {branches} branches concurrently.
                </div>
            </div>

            <Handle
                type="target"
                position={Position.Top}
                className="!h-3 !w-3 !bg-[#F0EEE9] !border-2"
                style={{ borderColor: '#131313' }}
            />

            {/* Branch Outputs */}
            <div className="relative h-4 w-full">
                {Array.from({ length: branches }).map((_, index) => {
                    const leftPos = ((index + 1) / (branches + 1)) * 100;
                    return (
                        <div key={index} className="absolute -bottom-2 flex flex-col items-center" style={{ left: `${leftPos}%`, transform: 'translateX(-50%)' }}>
                            <span className="mb-1 text-[9px] font-medium opacity-60">B{index + 1}</span>
                            <Handle
                                type="source"
                                position={Position.Bottom}
                                id={`branch-${index}`}
                                className="!h-2.5 !w-2.5 !bg-[#F0EEE9] !border-2"
                                style={{ borderColor: '#131313', position: 'static' }}
                            />
                        </div>
                    );
                })}
            </div>

            {/* Merge/Done Output */}
            <div className="absolute -bottom-10 left-1/2 flex -translate-x-1/2 flex-col items-center">
                <div className="mb-1 h-4 w-[1px] bg-border opacity-20"></div>
                <span className="mb-1 text-[10px] font-medium text-purple-600">Merge / Continue</span>
                <Handle
                    type="source"
                    position={Position.Bottom}
                    id="merge"
                    className="!h-3 !w-3 !bg-[#F0EEE9] !border-2"
                    style={{ borderColor: '#131313', position: 'static' }}
                />
            </div>
        </div>
    );
};

export default ParallelNode;
