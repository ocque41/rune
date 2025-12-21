'use client';

import React, { memo, useState } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { UserCheck, Settings } from 'lucide-react';

export type ApprovalNodeData = {
    label: string;
    approverEmail?: string;
    timeout?: string;
};

export const ApprovalNode = (props: NodeProps<any>) => {
    const { data, isConnectable, selected } = props;
    const [showConfig, setShowConfig] = useState(false);
    const [approverEmail, setApproverEmail] = useState(data.approverEmail || '');
    const [timeout, setTimeout] = useState(data.timeout || '24h');

    return (
        <div
            className={`min-w-[280px] rounded-xl border-2 transition-all ${selected
                ? 'border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.3)]'
                : 'border-white/10 hover:border-white/20'
                }`}
            style={{
                backgroundColor: '#111111',
                backdropFilter: 'blur(10px)',
            }}
        >
            {/* Header */}
            <div
                className="flex items-center justify-between border-b px-4 py-3"
                style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }}
            >
                <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-white/70">
                        <UserCheck size={16} />
                    </div>
                    <div>
                        <div className="text-sm font-semibold text-white/90">Approval</div>
                        <div className="text-[10px] text-white/40">Wait for human review</div>
                    </div>
                </div>
                <button
                    onClick={() => setShowConfig(!showConfig)}
                    className="rounded p-1.5 transition-colors text-white/40 hover:text-white/80 hover:bg-white/5"
                >
                    <Settings size={16} />
                </button>
            </div>

            {/* Content */}
            <div className="p-4 space-y-4">
                {showConfig && (
                    <>
                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-white/50">Approver Email</label>
                            <input
                                type="email"
                                placeholder="manager@example.com"
                                className="w-full rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-white/30 transition-all"
                                style={{
                                    backgroundColor: '#222222',
                                    border: 'none',
                                }}
                                value={approverEmail}
                                onChange={(e) => {
                                    setApproverEmail(e.target.value);
                                    data.approverEmail = e.target.value;
                                }}
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-medium text-white/50">Timeout</label>
                            <input
                                type="text"
                                placeholder="24h"
                                className="w-full rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-white/30 transition-all"
                                style={{
                                    backgroundColor: '#222222',
                                    border: 'none',
                                }}
                                value={timeout}
                                onChange={(e) => {
                                    setTimeout(e.target.value);
                                    data.timeout = e.target.value;
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

ApprovalNode.displayName = 'ApprovalNode';
