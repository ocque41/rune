'use client';

import React, { useState } from 'react';
import { Handle, Position, NodeProps, Node } from '@xyflow/react';
import { Group, Settings, ChevronDown, ChevronRight } from 'lucide-react'; // Using Group icon for grouping, Chevron for collapse

export type GroupNodeData = {
    label: string;
    isCollapsed: boolean;
    // For storing original dimensions
    originalWidth?: number;
    originalHeight?: number;
    // Function to toggle collapse state from FlowBuilderContent
    onToggleCollapse?: (nodeId: string, isCollapsed: boolean) => void;
    status?: 'idle' | 'running' | 'completed' | 'failed' | 'success' | 'failure';
};

export type CustomGroupNode = Node<GroupNodeData>;

const GroupNode = ({ id, data, selected }: NodeProps<CustomGroupNode>) => {
    const [showConfig, setShowConfig] = useState(false);
    const [label, setLabel] = useState(data.label || 'Node Group');

    // Handle initial collapse state
    if (data.isCollapsed === undefined) {
        data.isCollapsed = false;
    }

    const handleToggleCollapse = () => {
        if (data.onToggleCollapse) {
            data.onToggleCollapse(id, !data.isCollapsed);
        }
    };

    const nodeClassName = `
        min-w-[280px] min-h-[100px] rounded-xl border-2 transition-all
        ${selected ? 'border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.3)]' : 'border-white/10 hover:border-white/20'}
        ${data.isCollapsed ? 'collapsed-group' : 'expanded-group'}
    `;

    return (
        <div
            className={nodeClassName}
            style={{
                backgroundColor: '#111111',
                backdropFilter: 'blur(10px)',
                width: data.isCollapsed ? '250px' : data.originalWidth || 'auto', // Adjust width when collapsed
                height: data.isCollapsed ? '60px' : data.originalHeight || 'auto', // Adjust height when collapsed
                pointerEvents: 'all', // Ensure interaction for collapsing
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
                    <button
                        onClick={handleToggleCollapse}
                        className="rounded p-1.5 transition-colors text-white/40 hover:text-white/80 hover:bg-white/5"
                        aria-label={data.isCollapsed ? "Expand group" : "Collapse group"}
                    >
                        {data.isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
                    </button>
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white/70 ring-1 ring-white/20">
                        <Group size={16} />
                    </div>
                    <span className="text-sm font-semibold text-white/90 tracking-wide">
                        {label}
                    </span>
                </div>
                <button
                    onClick={() => setShowConfig(!showConfig)}
                    className="rounded p-1.5 transition-colors text-white/40 hover:text-white/80 hover:bg-white/5"
                    aria-label="Toggle node settings"
                >
                    <Settings size={16} />
                </button>
            </div>

            {showConfig && !data.isCollapsed && ( // Only show config when not collapsed
                <div className="p-3">
                    <div className="space-y-3">
                        <div>
                            <label htmlFor={`group-label-${id}`} className="mb-1 block text-xs font-medium text-white/50">Group Label</label>
                            <input
                                id={`group-label-${id}`}
                                type="text"
                                className="w-full rounded-lg bg-[#222222] border-none px-2 py-1.5 text-xs font-mono text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-white/30"
                                value={label}
                                onChange={(e) => {
                                    setLabel(e.target.value);
                                    data.label = e.target.value;
                                }}
                                placeholder="e.g. Data Processing"
                            />
                        </div>
                    </div>
                </div>
            )}
            
            {!data.isCollapsed && (
                <>
                    <Handle
                        type="target"
                        position={Position.Top}
                        className="!h-3 !w-3 !bg-[#F0EEE9]"
                        style={{ border: '2px solid #131313' }}
                    />
                    <Handle
                        type="source"
                        position={Position.Bottom}
                        className="!h-3 !w-3 !bg-[#F0EEE9]"
                        style={{ border: '2px solid #131313' }}
                    />
                </>
            )}
            {data.isCollapsed && (
                <div className="text-center text-xs text-white/50 py-2">
                    {/* Optionally show count of hidden nodes here */}
                    Group is collapsed
                </div>
            )}
        </div>
    );
};

export default GroupNode;