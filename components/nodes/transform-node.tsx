'use client';

import React, { memo, useState } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Code } from 'lucide-react';

export type TransformNodeData = {
    label: string;
    mapping?: string;
};

export const TransformNode = (props: NodeProps<any>) => {
    const { data, isConnectable } = props;
    const [mapping, setMapping] = useState(data.mapping || 'return params;');

    return (
        <div className="min-w-[250px] rounded-lg border bg-white shadow-sm transition-all hover:shadow-md dark:bg-black" style={{
            borderColor: 'var(--border-color)',
            backgroundColor: 'var(--node-background)'
        }}>
            {/* Header */}
            <div className="flex items-center gap-2 border-b px-3 py-2" style={{
                borderColor: 'var(--border-color)',
                backgroundColor: 'var(--header-background)'
            }}>
                <div className="flex h-6 w-6 items-center justify-center rounded" style={{
                    backgroundColor: 'var(--accent-bg)',
                    color: 'var(--foreground-title)'
                }}>
                    <Code size={14} />
                </div>
                <div className="flex-1">
                    <div className="text-sm font-medium" style={{ color: 'var(--foreground-title)' }}>Transform Data</div>
                    <div className="text-[10px] opacity-60" style={{ color: 'var(--foreground-subtitle)' }}>Map/Filter inputs</div>
                </div>
            </div>

            {/* Content */}
            <div className="p-3 space-y-3">
                <div>
                    <label className="mb-1 block text-xs font-medium" style={{ color: 'var(--foreground-body)' }}>Mapping Function (JS)</label>
                    <textarea
                        placeholder="return { ...params, newField: 'value' };"
                        className="w-full rounded border px-2 py-1 text-sm font-mono min-h-[80px]"
                        style={{
                            backgroundColor: 'var(--accent-bg)',
                            borderColor: 'var(--border-color)',
                            color: 'var(--foreground-body)'
                        }}
                        value={mapping}
                        onChange={(e) => {
                            setMapping(e.target.value);
                            data.mapping = e.target.value;
                        }}
                    />
                </div>
            </div>

            {/* Input Handle */}
            <Handle
                type="target"
                position={Position.Top}
                isConnectable={isConnectable}
                className="!h-3 !w-3 !bg-blue-500"
                style={{ border: '2px solid var(--background)' }}
            />

            {/* Output Handle */}
            <Handle
                type="source"
                position={Position.Bottom}
                isConnectable={isConnectable}
                className="!h-3 !w-3 !bg-blue-500"
                style={{ border: '2px solid var(--background)' }}
            />
        </div>
    );
};

TransformNode.displayName = 'TransformNode';
