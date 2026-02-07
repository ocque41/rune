'use client';

import React, { memo, useState } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Clock, AlertCircle } from 'lucide-react';

export type ScheduleNodeData = {
    label: string;
    cron: string;
    timezone?: string;
    status?: 'idle' | 'running' | 'completed' | 'failed' | 'success' | 'failure';
};

export const ScheduleNode = (props: NodeProps<any>) => {
    const { data, isConnectable } = props;
    const [cron, setCron] = useState(data.cron || '0 0 * * *');
    const [timezone, setTimezone] = useState(data.timezone || 'UTC');

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
            <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3 bg-white/5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white/70 ring-1 ring-white/20">
                    <Clock size={16} />
                </div>
                <div className="flex-1">
                    <div className="text-sm font-semibold text-white/90">Schedule</div>
                    <div className="text-[10px] text-white/40">Trigger on a timer</div>
                </div>
            </div>

            {/* Content */}
            <div className="p-3 space-y-3">
                <div>
                    <label className="mb-1 block text-xs font-medium text-white/50">Cron Expression</label>
                    <input
                        type="text"
                        placeholder="* * * * *"
                        className="w-full rounded-lg bg-[#222222] border-none px-2 py-1.5 text-sm font-mono text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-white/30"
                        value={cron}
                        onChange={(e) => {
                            setCron(e.target.value);
                            data.cron = e.target.value;
                        }}
                    />
                    <div className="mt-1 text-[10px] text-white/40">
                        min hour day month day-of-week
                    </div>
                </div>

                <div>
                    <label className="mb-1 block text-xs font-medium text-white/50">Timezone</label>
                    <select
                        className="w-full rounded-lg bg-[#222222] border-none px-2 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-white/30"
                        value={timezone}
                        onChange={(e) => {
                            setTimezone(e.target.value);
                            data.timezone = e.target.value;
                        }}
                    >
                        <option value="UTC">UTC</option>
                        <option value="America/New_York">New York (EST/EDT)</option>
                        <option value="America/Los_Angeles">Los Angeles (PST/PDT)</option>
                        <option value="Europe/London">London (GMT/BST)</option>
                        <option value="Europe/Paris">Paris (CET/CEST)</option>
                        <option value="Asia/Tokyo">Tokyo (JST)</option>
                    </select>
                </div>
            </div>

            {/* Output Handle */}
            <Handle
                type="target"
                position={Position.Top}
                isConnectable={isConnectable}
                className="!h-3 !w-3 !bg-[#F0EEE9]"
                style={{ border: '2px solid #131313' }}
            />
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

ScheduleNode.displayName = 'ScheduleNode';
