'use client';

import React, { useState } from 'react';
import { Handle, Position, NodeProps, Node } from '@xyflow/react';
import { Repeat, Settings } from 'lucide-react';

export type LoopNodeData = {
    label: string;
    items?: string;
};

export type CustomLoopNode = Node<LoopNodeData>;

const LoopNode = ({ data, selected }: NodeProps<CustomLoopNode>) => {
    const [showConfig, setShowConfig] = useState(false);
    const [items, setItems] = useState(data.items || '[]');

    return (
        <div
            className={`min-w-[200px] rounded-lg border shadow-sm transition-all ${selected ? 'ring-2 ring-blue-500/20' : ''}`}
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
                        <Repeat size={12} />
                    </div>
                    <span className="text-sm font-medium" style={{ color: 'var(--foreground-body)' }}>
                        For Each
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
                    <label className="mb-1 block text-xs font-medium" style={{ color: 'var(--foreground-body)' }}>Items (Array)</label>
                    <input
                        type="text"
                        placeholder="e.g. params.users"
                        className="w-full rounded border px-2 py-1 text-sm font-mono"
                        style={{
                            backgroundColor: 'var(--accent-bg)',
                            borderColor: 'var(--border-color)',
                            color: 'var(--foreground-body)'
                        }}
                        value={items}
                        onChange={(e) => {
                            setItems(e.target.value);
                            data.items = e.target.value;
                        }}
                    />
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

            {/* Body Output */}
            <div className="absolute -bottom-6 left-1/4 flex flex-col items-center">
                <span className="mb-1 text-[10px] font-medium text-blue-600">Loop Body</span>
                <Handle
                    type="source"
                    position={Position.Bottom}
                    id="body"
                    className="!h-3 !w-3 !border-2 !transition-colors hover:!bg-blue-500"
                    style={{
                        backgroundColor: 'var(--foreground)',
                        borderColor: 'var(--background)',
                        left: '25%'
                    }}
                />
            </div>

            {/* Done Output */}
            <div className="absolute -bottom-6 right-1/4 flex flex-col items-center">
                <span className="mb-1 text-[10px] font-medium text-gray-600">Done</span>
                <Handle
                    type="source"
                    position={Position.Bottom}
                    id="done"
                    className="!h-3 !w-3 !border-2 !transition-colors hover:!bg-gray-500"
                    style={{
                        backgroundColor: 'var(--foreground)',
                        borderColor: 'var(--background)',
                        left: '75%'
                    }}
                />
            </div>
        </div>
    );
};

export default LoopNode;
