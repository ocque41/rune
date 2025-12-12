'use client';

import React, { memo, useState } from 'react';
import { Position, NodeProps } from '@xyflow/react';
import { Sparkles } from 'lucide-react';
import { NodeWrapper } from './node-wrapper';

export type AINodeData = {
    label: string;
    prompt?: string;
    model?: string;
};

export const AINode = (props: NodeProps<any>) => {
    const { data, isConnectable, selected } = props;
    const [prompt, setPrompt] = useState(data.prompt || '');
    const [model, setModel] = useState(data.model || 'gemini-pro');

    return (
        <NodeWrapper
            selected={selected}
            handles={[
                { type: 'target', position: Position.Top },
                { type: 'source', position: Position.Bottom }
            ]}
            className="min-w-[280px]"
        >
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3 bg-white/5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white/70 ring-1 ring-white/20">
                    <Sparkles size={16} />
                </div>
                <div className="flex-1">
                    <div className="text-sm font-semibold text-white/90 tracking-wide">AI Generation</div>
                    <div className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Generate text with AI</div>
                </div>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
                <div className="space-y-1.5">
                    <label className="text-[10px] uppercase tracking-wider font-bold text-white/30">Model</label>
                    <select
                        className="w-full rounded-lg bg-[#222222] border-none px-2 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-white/30 transition-colors"
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

                <div className="space-y-1.5">
                    <label className="text-[10px] uppercase tracking-wider font-bold text-white/30">Prompt</label>
                    <textarea
                        placeholder="Write a poem about..."
                        className="w-full rounded-lg bg-[#222222] border-none px-3 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-white/30 transition-colors min-h-[100px]"
                        value={prompt}
                        onChange={(e) => {
                            setPrompt(e.target.value);
                            data.prompt = e.target.value;
                        }}
                    />
                </div>
            </div>
        </NodeWrapper>
    );
};

AINode.displayName = 'AINode';
