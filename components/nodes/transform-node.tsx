'use client';

import React, { memo, useState } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Code, Settings } from 'lucide-react';

export type TransformNodeData = {
    label: string;
    mapping?: string;
    transformType?: 'javascript' | 'jsonata'; // New property
    status?: 'idle' | 'running' | 'completed' | 'failed' | 'success' | 'failure';
};

export const TransformNode = (props: NodeProps<any>) => {
    const { data, isConnectable } = props;
    const [showConfig, setShowConfig] = useState(false);
    const [mapping, setMapping] = useState(data.mapping || 'return params;');
    const [transformType, setTransformType] = useState(data.transformType || 'javascript'); // New state for transformType

    // Update node data when transformType changes
    const onTransformTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newType = e.target.value as 'javascript' | 'jsonata';
        setTransformType(newType);
        data.transformType = newType;
        // Optionally, reset mapping or set a default based on type
        if (newType === 'jsonata' && data.mapping === 'return params;') {
            setMapping('$.'); // Default JSONata identity
            data.mapping = '$.';
        } else if (newType === 'javascript' && data.mapping === '$.') {
            setMapping('return params;'); // Default JS identity
            data.mapping = 'return params;';
        }
    };

    return (
        <div
            className={`min-w-[250px] rounded-xl border-2 transition-all ${props.selected ? 'border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.3)]' : 'border-white/10 hover:border-white/20'}`}
            style={{
                backgroundColor: '#111111',
                backdropFilter: 'blur(10px)'
            }}
        >
            {/* Status Indicator */}
            {props.data.status && props.data.status !== 'idle' && (
                <div className="absolute top-0 right-0 p-2">
                    <div className={`h-3 w-3 rounded-full shadow-lg ${props.data.status === 'running' ? 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)] animate-pulse' :
                        (props.data.status === 'completed' || props.data.status === 'success') ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' :
                            (props.data.status === 'failed' || props.data.status === 'failure') ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]' :
                                'bg-white/30' // Default for unknown/idle
                            }`} />
                </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 bg-white/5">
                <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white/70 ring-1 ring-white/20">
                        <Code size={16} />
                    </div>
                    <div>
                        <div className="text-sm font-semibold text-white/90">Transform Data</div>
                        <div className="text-[10px] text-white/40">Map/Filter inputs</div>
                    </div>
                </div>
                <button
                    onClick={() => setShowConfig(!showConfig)}
                    className="rounded p-1.5 transition-colors text-white/40 hover:text-white/80 hover:bg-white/5"
                    aria-label="Toggle node settings"
                >
                    <Settings size={16} />
                </button>
            </div>

            {/* Content */}
            <div className="p-3 space-y-3">
                {showConfig && (
                    <>
                        <div>
                            <label htmlFor="transform-type-select" className="mb-1 block text-xs font-medium text-white/50">Transformation Type</label>
                            <select
                                id="transform-type-select"
                                className="w-full rounded-lg bg-[#222222] border-none px-2 py-1.5 text-xs font-mono text-white focus:outline-none focus:ring-1 focus:ring-white/30"
                                value={transformType}
                                onChange={onTransformTypeChange}
                            >
                                <option value="javascript">JavaScript</option>
                                <option value="jsonata">JSONata</option>
                            </select>
                        </div>
                        <div>
                            <label htmlFor="mapping-input" className="mb-1 block text-xs font-medium text-white/50">
                                {transformType === 'javascript' ? 'Mapping Function (JS)' : 'JSONata Expression'}
                            </label>
                            <textarea
                                id="mapping-input"
                                placeholder={transformType === 'javascript' ? 'return params;' : '$.'}
                                className="w-full rounded-lg bg-[#222222] border-none px-2 py-1.5 text-sm font-mono text-white placeholder-white/30 min-h-[80px] focus:outline-none focus:ring-1 focus:ring-white/30"
                                value={mapping}
                                onChange={(e) => {
                                    setMapping(e.target.value);
                                    data.mapping = e.target.value;
                                }}
                            />
                        </div>
                    </>
                )}
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
