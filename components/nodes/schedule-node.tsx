'use client';

import React, { memo, useState } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Clock, AlertCircle } from 'lucide-react';

export type ScheduleNodeData = {
    label: string;
    cron: string;
    timezone?: string;
};

export const ScheduleNode = (props: NodeProps<any>) => {
    const { data, isConnectable } = props;
    const [cron, setCron] = useState(data.cron || '0 0 * * *');
    const [timezone, setTimezone] = useState(data.timezone || 'UTC');

    return (
        <div className="min-w-[250px] rounded-lg border bg-white shadow-sm transition-all hover:shadow-md dark:bg-black" style={{
            borderColor: 'var(--border-color)',
            backgroundColor: 'var(--node-background)'
        }}>
            {/* Header */}
            <div className="flex items-center gap-2 border-b px-3 py-2" style={{
                borderColor: 'var(--border-color)',
                backgroundColor: 'var(--header-background)'
            }}>
                <div className="flex h-6 w-6 items-center justify-center rounded" style={{
                    backgroundColor: 'var(--accent-bg)',
                    color: 'var(--foreground-title)'
                }}>
                    <Clock size={14} />
                </div>
                <div className="flex-1">
                    <div className="text-sm font-medium" style={{ color: 'var(--foreground-title)' }}>Schedule</div>
                    <div className="text-[10px] opacity-60" style={{ color: 'var(--foreground-subtitle)' }}>Trigger on a timer</div>
                </div>
            </div>

            {/* Content */}
            <div className="p-3 space-y-3">
                <div>
                    <label className="mb-1 block text-xs font-medium" style={{ color: 'var(--foreground-body)' }}>Cron Expression</label>
                    <input
                        type="text"
                        placeholder="* * * * *"
                        className="w-full rounded border px-2 py-1 text-sm font-mono"
                        style={{
                            backgroundColor: 'var(--accent-bg)',
                            borderColor: 'var(--border-color)',
                            color: 'var(--foreground-body)'
                        }}
                        value={cron}
                        onChange={(e) => {
                            setCron(e.target.value);
                            data.cron = e.target.value;
                        }}
                    />
                    <div className="mt-1 text-[10px] opacity-60" style={{ color: 'var(--foreground-subtitle)' }}>
                        min hour day month day-of-week
                    </div>
                </div>

                <div>
                    <label className="mb-1 block text-xs font-medium" style={{ color: 'var(--foreground-body)' }}>Timezone</label>
                    <select
                        className="w-full rounded border px-2 py-1 text-sm"
                        style={{
                            backgroundColor: 'var(--accent-bg)',
                            borderColor: 'var(--border-color)',
                            color: 'var(--foreground-body)'
                        }}
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
                type="source"
                position={Position.Bottom}
                isConnectable={isConnectable}
                className="!h-3 !w-3 !bg-blue-500"
                style={{ border: '2px solid var(--background)' }}
            />
        </div>
    );
};

ScheduleNode.displayName = 'ScheduleNode';
