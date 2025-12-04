'use client';

import React, { useState } from 'react';
import { Handle, Position, NodeProps, Node } from '@xyflow/react';
import { GitMerge, Settings, Plus, Minus } from 'lucide-react';

export type ParallelNodeData = {
    label: string;
    branches?: number;
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
                        <GitMerge size={12} className="rotate-90" />
                    </div>
                    <span className="text-sm font-medium" style={{ color: 'var(--foreground-body)' }}>
                        Parallel Execution
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
                className="!h-3 !w-3 !border-2 !transition-colors hover:!bg-blue-500"
                style={{
                    backgroundColor: 'var(--foreground)',
                    borderColor: 'var(--background)'
                }}
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
                                className="!h-2.5 !w-2.5 !border-2 !transition-colors hover:!bg-blue-500"
                                style={{
                                    backgroundColor: 'var(--foreground)',
                                    borderColor: 'var(--background)',
                                    position: 'static'
                                }}
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
                    className="!h-3 !w-3 !border-2 !transition-colors hover:!bg-purple-500"
                    style={{
                        backgroundColor: 'var(--foreground)',
                        borderColor: 'var(--background)',
                        position: 'static'
                    }}
                />
            </div>
        </div>
    );
};

export default ParallelNode;
