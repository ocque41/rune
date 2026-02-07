'use client';

import React, { useState } from 'react';
import { Handle, Position, NodeProps, Node } from '@xyflow/react';
import { Repeat, Settings } from 'lucide-react';

export type LoopNodeData = {
    label: string;
    items?: string;
    status?: 'idle' | 'running' | 'completed' | 'failed' | 'success' | 'failure';
};

export type CustomLoopNode = Node<LoopNodeData>;

const LoopNode = ({ data, selected }: NodeProps<CustomLoopNode>) => {
    const [showConfig, setShowConfig] = useState(false);
    const [items, setItems] = useState(data.items || '[]');

    return (
        <div
            className={`min-w-[200px] rounded-xl border-2 transition-all ${selected ? 'border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.3)]' : 'border-white/10 hover:border-white/20'}`}
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
                        <Repeat size={16} />
                    </div>
                    <span className="text-sm font-semibold text-white/90 tracking-wide">
                        For Each
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
                    <div className="mb-2">
                        <label className="mb-1 block text-xs font-medium text-white/50">Items (Array)</label>
                        <input
                            type="text"
                            placeholder="e.g. params.users"
                            className="w-full rounded-lg bg-[#222222] border-none px-2 py-1.5 text-sm font-mono text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-white/30"
                            value={items}
                            onChange={(e) => {
                                setItems(e.target.value);
                                data.items = e.target.value;
                            }}
                        />
                    </div>
                )}
            </div>

            <Handle
                type="target"
                position={Position.Top}
                className="!h-3 !w-3 !bg-[#F0EEE9] !border-2"
                style={{ borderColor: '#131313' }}
            />

            <div className="absolute -bottom-6 left-1/4 flex flex-col items-center">
                <span className="mb-1 text-[10px] font-medium text-blue-400">Loop Body</span>
                <Handle
                    type="source"
                    position={Position.Bottom}
                    id="body"
                    className="!h-3 !w-3 !bg-[#F0EEE9] !border-2"
                    style={{ borderColor: '#131313', left: '25%' }}
                />
            </div>

            <div className="absolute -bottom-6 right-1/4 flex flex-col items-center">
                <span className="mb-1 text-[10px] font-medium text-white/50">Done</span>
                <Handle
                    type="source"
                    position={Position.Bottom}
                    id="done"
                    className="!h-3 !w-3 !bg-gray-500 !border-2"
                    style={{ borderColor: '#131313', left: '75%' }}
                />
            </div>
        </div>
    );
};

export default LoopNode;
