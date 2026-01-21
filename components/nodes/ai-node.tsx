'use client';

import React, { memo, useState } from 'react';
import { Position, NodeProps } from '@xyflow/react';
import { Sparkles, Settings } from 'lucide-react';
import { NodeWrapper } from './node-wrapper';

export type AINodeData = {
    label: string;
    prompt?: string;
    model?: string;
    thinkingLevel?: string;
};

export const AINode = (props: NodeProps<any>) => {
    const { data, isConnectable, selected } = props;
    const [showConfig, setShowConfig] = useState(false);
    const [prompt, setPrompt] = useState(data.prompt || '');
    const [model, setModel] = useState(() => {
        // Enforce Gemini 3 models even if legacy data exists
        if (data.model?.startsWith('gemini-3')) return data.model;
        return 'gemini-3-flash-preview';
    });
    const [thinkingLevel, setThinkingLevel] = useState(data.thinkingLevel || 'high');

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
            <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3 bg-white/5 justify-between">
                <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white/70 ring-1 ring-white/20">
                        <Sparkles size={16} />
                    </div>
                    <div>
                        <div className="text-sm font-semibold text-white/90 tracking-wide">AI Generation</div>
                        <div className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Generate text with AI</div>
                    </div>
                </div>
                <button
                    onClick={() => setShowConfig(!showConfig)}
                    className="rounded p-1.5 transition-colors text-white/40 hover:text-white/80 hover:bg-white/5"
                >
                    <Settings size={16} />
                </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
                {showConfig && (
                    <>
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
                                <option value="gemini-3-pro-preview">Gemini 3 Pro (Preview)</option>
                                <option value="gemini-3-flash-preview">Gemini 3 Flash (Preview)</option>
                            </select>
                        </div>

                        {model.startsWith('gemini-3') && (
                            <div className="space-y-1.5">
                                <label className="text-[10px] uppercase tracking-wider font-bold text-white/30">Thinking Level</label>
                                <select
                                    className="w-full rounded-lg bg-[#222222] border-none px-2 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-white/30 transition-colors"
                                    value={thinkingLevel}
                                    onChange={(e) => {
                                        setThinkingLevel(e.target.value);
                                        data.thinkingLevel = e.target.value;
                                    }}
                                >
                                    <option value="high">High (Default)</option>
                                    <option value="low">Low</option>
                                    {model.includes('flash') && (
                                        <>
                                            <option value="medium">Medium</option>
                                            <option value="minimal">Minimal</option>
                                        </>
                                    )}
                                </select>
                            </div>
                        )}

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
                    </>
                )}
            </div>
        </NodeWrapper>
    );
};

AINode.displayName = 'AINode';
