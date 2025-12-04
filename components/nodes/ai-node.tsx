'use client';

import React, { memo, useState } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Sparkles } from 'lucide-react';

export type AINodeData = {
    label: string;
    prompt?: string;
    model?: string;
};

export const AINode = (props: NodeProps<any>) => {
    const { data, isConnectable } = props;
    const [prompt, setPrompt] = useState(data.prompt || '');
    const [model, setModel] = useState(data.model || 'gemini-pro');

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
                    <Sparkles size={14} />
                </div>
                <div className="flex-1">
                    <div className="text-sm font-medium" style={{ color: 'var(--foreground-title)' }}>AI Generation</div>
                    <div className="text-[10px] opacity-60" style={{ color: 'var(--foreground-subtitle)' }}>Generate text with AI</div>
                </div>
            </div>

            {/* Content */}
            <div className="p-3 space-y-3">
                <div>
                    <label className="mb-1 block text-xs font-medium" style={{ color: 'var(--foreground-body)' }}>Model</label>
                    <select
                        className="w-full rounded border px-2 py-1 text-sm"
                        style={{
                            backgroundColor: 'var(--accent-bg)',
                            borderColor: 'var(--border-color)',
                            color: 'var(--foreground-body)'
                        }}
                        value={model}
                        onChange={(e) => {
                            setModel(e.target.value);
                            data.model = e.target.value;
                        }}
                    >
                        <option value="gemini-pro">Gemini Pro</option>
                        <option value="gpt-4">GPT-4</option>
                        <option value="claude-3">Claude 3</option>
                    </select>
                </div>

                <div>
                    <label className="mb-1 block text-xs font-medium" style={{ color: 'var(--foreground-body)' }}>Prompt</label>
                    <textarea
                        placeholder="Write a poem about..."
                        className="w-full rounded border px-2 py-1 text-sm min-h-[80px]"
                        style={{
                            backgroundColor: 'var(--accent-bg)',
                            borderColor: 'var(--border-color)',
                            color: 'var(--foreground-body)'
                        }}
                        value={prompt}
                        onChange={(e) => {
                            setPrompt(e.target.value);
                            data.prompt = e.target.value;
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

AINode.displayName = 'AINode';
