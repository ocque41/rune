'use client';

import React, { memo, useState } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { UserCheck } from 'lucide-react';

export type ApprovalNodeData = {
    label: string;
    approverEmail?: string;
    timeout?: string;
};

export const ApprovalNode = (props: NodeProps<any>) => {
    const { data, isConnectable } = props;
    const [approverEmail, setApproverEmail] = useState(data.approverEmail || '');
    const [timeout, setTimeout] = useState(data.timeout || '24h');

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
                    <UserCheck size={14} />
                </div>
                <div className="flex-1">
                    <div className="text-sm font-medium" style={{ color: 'var(--foreground-title)' }}>Approval</div>
                    <div className="text-[10px] opacity-60" style={{ color: 'var(--foreground-subtitle)' }}>Wait for human review</div>
                </div>
            </div>

            {/* Content */}
            <div className="p-3 space-y-3">
                <div>
                    <label className="mb-1 block text-xs font-medium" style={{ color: 'var(--foreground-body)' }}>Approver Email</label>
                    <input
                        type="email"
                        placeholder="manager@example.com"
                        className="w-full rounded border px-2 py-1 text-sm"
                        style={{
                            backgroundColor: 'var(--accent-bg)',
                            borderColor: 'var(--border-color)',
                            color: 'var(--foreground-body)'
                        }}
                        value={approverEmail}
                        onChange={(e) => {
                            setApproverEmail(e.target.value);
                            data.approverEmail = e.target.value;
                        }}
                    />
                </div>

                <div>
                    <label className="mb-1 block text-xs font-medium" style={{ color: 'var(--foreground-body)' }}>Timeout</label>
                    <input
                        type="text"
                        placeholder="24h"
                        className="w-full rounded border px-2 py-1 text-sm"
                        style={{
                            backgroundColor: 'var(--accent-bg)',
                            borderColor: 'var(--border-color)',
                            color: 'var(--foreground-body)'
                        }}
                        value={timeout}
                        onChange={(e) => {
                            setTimeout(e.target.value);
                            data.timeout = e.target.value;
                        }}
                    />
                </div>
            </div>

            {/* Input Handle */}
            <Handle
                type="target"
                position={Position.Top}
                isConnectable={isConnectable}
                className="!h-3 !w-3 !bg-blue-500"
                style={{ border: '2px solid var(--background)' }}
            />

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

ApprovalNode.displayName = 'ApprovalNode';
