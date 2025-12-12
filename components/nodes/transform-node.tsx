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
        <div
            className={`min-w-[250px] rounded-xl border-2 transition-all ${props.selected ? 'border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.3)]' : 'border-white/10 hover:border-white/20'}`}
            style={{
                backgroundColor: '#111111',
                backdropFilter: 'blur(10px)'
            }}
        >
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3 bg-white/5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white/70 ring-1 ring-white/20">
                    <Code size={16} />
                </div>
                <div className="flex-1">
                    <div className="text-sm font-semibold text-white/90">Transform Data</div>
                    <div className="text-[10px] text-white/40">Map/Filter inputs</div>
                </div>
            </div>

            {/* Content */}
            <div className="p-3 space-y-3">
                <div>
                    <label className="mb-1 block text-xs font-medium text-white/50">Mapping Function (JS)</label>
                    <textarea
                        placeholder="return { ...params, newField: 'value' };"
                        className="w-full rounded-lg bg-[#222222] border-none px-2 py-1.5 text-sm font-mono text-white placeholder-white/30 min-h-[80px] focus:outline-none focus:ring-1 focus:ring-white/30"
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
                className="!h-3 !w-3 !bg-[#F0EEE9]"
                style={{ border: '2px solid #131313' }}
            />

            {/* Output Handle */}
            <Handle
                type="source"
                position={Position.Bottom}
                isConnectable={isConnectable}
                className="!h-3 !w-3 !bg-[#F0EEE9]"
                style={{ border: '2px solid #131313' }}
            />
        </div>
    );
};

TransformNode.displayName = 'TransformNode';
