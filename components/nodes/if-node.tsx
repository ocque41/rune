import React, { useState } from 'react';
import { Handle, Position, NodeProps, Node } from '@xyflow/react';
import { Split, Settings } from 'lucide-react';
import { NodeWrapper } from './node-wrapper';

export type IfNodeData = {
    label: string;
    condition?: string;
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
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10 text-purple-400 ring-1 ring-purple-500/20">
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
                <div className="space-y-1.5">
                    <label className="text-[10px] uppercase tracking-wider font-bold text-white/30">Condition (JS)</label>
                    <input
                        type="text"
                        placeholder="e.g. params.value > 10"
                        className="w-full rounded bg-black/20 border border-white/10 px-3 py-2 text-sm font-mono text-purple-300 placeholder-white/20 focus:outline-none focus:border-purple-500/50 transition-colors"
                        value={condition}
                        onChange={(e) => {
                            setCondition(e.target.value);
                            data.condition = e.target.value;
                        }}
                    />
                </div>
            </div>

            {/* True Output */}
            <div className="absolute -bottom-6 left-1/4 flex flex-col items-center">
                <span className="mb-1 text-[10px] font-bold text-green-500 uppercase tracking-widest">True</span>
                <Handle
                    type="source"
                    position={Position.Bottom}
                    id="true"
                    className="!h-3 !w-3 !bg-green-500 !border-2 !border-[#0f172a]"
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
                    className="!h-3 !w-3 !bg-red-500 !border-2 !border-[#0f172a]"
                    style={{ left: '75%' }}
                />
            </div>
        </NodeWrapper>
    );
};

export default IfNode;
