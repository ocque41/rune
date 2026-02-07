import React, { useState } from 'react';
import { Handle, Position, NodeProps, Node } from '@xyflow/react';
import { Split, Settings } from 'lucide-react';
import { NodeWrapper } from './node-wrapper';

export type IfNodeData = {
    label: string;
    condition?: string;
    status?: 'idle' | 'running' | 'completed' | 'failed' | 'skipped' | 'success' | 'failure';
};

export type CustomIfNode = Node<IfNodeData>;

const IfNode = ({ data, selected }: NodeProps<CustomIfNode>) => {
    const [showConfig, setShowConfig] = useState(false);
    const [condition, setCondition] = useState(data.condition || 'true');

    return (
        <NodeWrapper
            selected={selected}
            handles={[
                { type: 'target', position: Position.Top }
            ]}
            className="min-w-[240px]"
        >
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 bg-white/5">
                <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white/70 ring-1 ring-white/20">
                        <Split size={16} />
                    </div>
                    <span className="text-sm font-semibold text-white/90 tracking-wide">
                        If / Else
                    </span>
                </div>
                <button
                    onClick={() => setShowConfig(!showConfig)}
                    className="rounded p-1.5 transition-colors text-white/40 hover:text-white/80 hover:bg-white/5"
                >
                    <Settings size={16} />
                </button>
            </div>

            <div className="p-4 space-y-4">
                {showConfig && (
                    <div className="space-y-1.5">
                        <label className="text-[10px] uppercase tracking-wider font-bold text-white/30">Condition (JS)</label>
                        <input
                            type="text"
                            placeholder="e.g. params.value > 10"
                            className="w-full rounded-lg bg-[#222222] border-none px-3 py-2 text-sm font-mono text-purple-300 placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-white/30 transition-colors"
                            value={condition}
                            onChange={(e) => {
                                setCondition(e.target.value);
                                data.condition = e.target.value;
                            }}
                        />
                    </div>
                )}
            </div>

            {data.status && data.status !== 'idle' && (
                <div className="absolute top-0 right-0 p-2"> {/* Positioning adjusted for top-right */}
                    <div className={`h-3 w-3 rounded-full shadow-lg ${data.status === 'running' ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)] animate-pulse' :
                        (data.status === 'completed' || data.status === 'success') ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' :
                        (data.status === 'failed' || data.status === 'failure') ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' :
                        data.status === 'skipped' ? 'bg-gray-500 shadow-[0_0_8px_rgba(107,114,128,0.5)]' : // Skipped status
                            'bg-white/30' // Default for unknown/idle
                        }`} />
                </div>
            )}

            {/* True Output */}
            <div className="absolute -bottom-6 left-1/4 flex flex-col items-center">
                <span className="mb-1 text-[10px] font-bold text-green-500 uppercase tracking-widest">True</span>
                <Handle
                    type="source"
                    position={Position.Bottom}
                    id="true"
                    className="!h-3 !w-3 !bg-[#F0EEE9] !border-2 !border-[#131313]"
                    style={{ left: '25%' }}
                />
            </div>

            {/* False Output */}
            <div className="absolute -bottom-6 right-1/4 flex flex-col items-center">
                <span className="mb-1 text-[10px] font-bold text-red-500 uppercase tracking-widest">False</span>
                <Handle
                    type="source"
                    position={Position.Bottom}
                    id="false"
                    className="!h-3 !w-3 !bg-[#F0EEE9] !border-2 !border-[#131313]"
                    style={{ left: '75%' }}
                />
            </div>
        </NodeWrapper>
    );
};

export default IfNode;
