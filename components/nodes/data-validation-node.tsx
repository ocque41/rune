'use client';

import React, { useState } from 'react';
import { Handle, Position, NodeProps, Node } from '@xyflow/react';
import { CheckSquare, Settings } from 'lucide-react'; // Using CheckSquare icon for validation

export type DataValidationNodeData = {
    label: string;
    schema: string; // JSON string of the validation schema
    dataPath: string; // Path to the data within workflow params to validate (e.g., 'params.data')
    onFailure: 'failWorkflow' | 'passThrough' | 'routeToError'; // How to handle validation failure
    status?: 'idle' | 'running' | 'completed' | 'failed' | 'success' | 'failure';
};

export type CustomDataValidationNode = Node<DataValidationNodeData>;

const DataValidationNode = ({ data, selected }: NodeProps<CustomDataValidationNode>) => {
    const [showConfig, setShowConfig] = useState(false);
    const [schema, setSchema] = useState(data.schema || '{}');
    const [dataPath, setDataPath] = useState(data.dataPath || 'params');
    const [onFailure, setOnFailure] = useState(data.onFailure || 'failWorkflow');

    return (
        <div
            className={`min-w-[300px] rounded-xl border-2 transition-all ${selected ? 'border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.3)]' : 'border-white/10 hover:border-white/20'}`}
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
                        <CheckSquare size={16} />
                    </div>
                    <span className="text-sm font-semibold text-white/90 tracking-wide">
                        Data Validation
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
                    <div className="space-y-3">
                        <div>
                            <label className="mb-1 block text-xs font-medium text-white/50">JSON Schema</label>
                            {/* In a real app, this would be a proper JSON schema editor component */}
                            <textarea
                                className="w-full rounded-lg bg-[#222222] border-none px-2 py-1.5 text-xs font-mono text-white placeholder-white/30 min-h-[100px] focus:outline-none focus:ring-1 focus:ring-white/30"
                                value={schema}
                                onChange={(e) => {
                                    setSchema(e.target.value);
                                    data.schema = e.target.value;
                                }}
                                placeholder='{"type": "object", "properties": {"id": {"type": "string"}}}'
                            />
                            <p className="mt-1 text-[10px] text-white/50">JSON Schema for validation.</p>
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-medium text-white/50">Data Path</label>
                            <input
                                type="text"
                                className="w-full rounded-lg bg-[#222222] border-none px-2 py-1.5 text-xs font-mono text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-white/30"
                                value={dataPath}
                                onChange={(e) => {
                                    setDataPath(e.target.value);
                                    data.dataPath = e.target.value;
                                }}
                                placeholder="params.data"
                            />
                            <p className="mt-1 text-[10px] text-white/50">Path within workflow `params` to the data to validate.</p>
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-medium text-white/50">On Validation Failure</label>
                            <select
                                className="w-full rounded-lg bg-[#222222] border-none px-2 py-1.5 text-xs font-mono text-white focus:outline-none focus:ring-1 focus:ring-white/30"
                                value={onFailure}
                                onChange={(e) => {
                                    const val = e.target.value as DataValidationNodeData['onFailure'];
                                    setOnFailure(val);
                                    data.onFailure = val;
                                }}
                            >
                                <option value="failWorkflow">Fail Workflow</option>
                                <option value="passThrough">Pass Through (continue workflow)</option>
                                <option value="routeToError">Route to Error Branch</option>
                            </select>
                            <p className="mt-1 text-[10px] text-white/50">Action to take if validation fails.</p>
                        </div>
                    </div>
                )}
            </div>

            <Handle
                type="target"
                position={Position.Top}
                className="!h-3 !w-3 !bg-[#F0EEE9]"
                style={{ border: '2px solid #131313' }}
            />

            <div className="absolute -bottom-6 left-1/4 flex flex-col items-center">
                <span className="mb-1 text-[10px] font-medium text-green-400">On Success</span>
                <Handle
                    type="source"
                    position={Position.Bottom}
                    id="onSuccess"
                    className="!h-3 !w-3 !bg-green-500 !border-2"
                    style={{ borderColor: '#131313', left: '25%' }}
                />
            </div>

            <div className="absolute -bottom-6 right-1/4 flex flex-col items-center">
                <span className="mb-1 text-[10px] font-medium text-red-400">On Failure</span>
                <Handle
                    type="source"
                    position={Position.Bottom}
                    id="onFailure"
                    className="!h-3 !w-3 !bg-red-500 !border-2"
                    style={{ borderColor: '#131313', left: '75%' }}
                />
            </div>
        </div>
    );
};

export default DataValidationNode;