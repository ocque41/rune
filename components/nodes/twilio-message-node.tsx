'use client';

import React, { useState } from 'react';
import { Handle, Position, NodeProps, Node } from '@xyflow/react';
import { MessageSquareText, Settings } from 'lucide-react'; // Using MessageSquareText icon for SMS

export type TwilioMessageNodeData = {
    label: string;
    fromPhoneNumber: string; // The Twilio phone number
    toPhoneNumber: string; // Recipient's phone number
    messageBody: string; // The message content
    accountSidSecretName: string; // Name of the secret holding Twilio Account SID (e.g., 'TWILIO_ACCOUNT_SID')
    authTokenSecretName: string; // Name of the secret holding Twilio Auth Token (e.g., 'TWILIO_AUTH_TOKEN')
    status?: 'idle' | 'running' | 'completed' | 'failed' | 'success' | 'failure';
};

export type CustomTwilioMessageNode = Node<TwilioMessageNodeData>;

const TwilioMessageNode = ({ id, data, selected }: NodeProps<CustomTwilioMessageNode>) => {
    const [showConfig, setShowConfig] = useState(false);
    const [fromPhoneNumber, setFromPhoneNumber] = useState(data.fromPhoneNumber || '{{SECRET_TWILIO_FROM_NUMBER}}');
    const [toPhoneNumber, setToPhoneNumber] = useState(data.toPhoneNumber || '{{params.toPhoneNumber}}');
    const [messageBody, setMessageBody] = useState(data.messageBody || 'Hello from Rune Workflow!');
    const [accountSidSecretName, setAccountSidSecretName] = useState(data.accountSidSecretName || 'TWILIO_ACCOUNT_SID');
    const [authTokenSecretName, setAuthTokenSecretName] = useState(data.authTokenSecretName || 'TWILIO_AUTH_TOKEN');

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
                        <MessageSquareText size={16} />
                    </div>
                    <span className="text-sm font-semibold text-white/90 tracking-wide">
                        Send SMS (Twilio)
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

            <div className="p-3">
                {showConfig && (
                    <div className="space-y-3">
                        <div>
                            <label htmlFor={`from-phone-${id}`} className="mb-1 block text-xs font-medium text-white/50">From Phone Number (Twilio)</label>
                            <input
                                id={`from-phone-${id}`}
                                type="text"
                                className="w-full rounded-lg bg-[#222222] border-none px-2 py-1.5 text-xs font-mono text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-white/30"
                                value={fromPhoneNumber}
                                onChange={(e) => {
                                    setFromPhoneNumber(e.target.value);
                                    data.fromPhoneNumber = e.target.value;
                                }}
                                placeholder="e.g. +15017122661 or {{SECRET_TWILIO_FROM_NUMBER}}"
                            />
                            <p className="mt-1 text-[10px] text-white/50">Your Twilio phone number, can be a secret.</p>
                        </div>
                        <div>
                            <label htmlFor={`to-phone-${id}`} className="mb-1 block text-xs font-medium text-white/50">To Phone Number</label>
                            <input
                                id={`to-phone-${id}`}
                                type="text"
                                className="w-full rounded-lg bg-[#222222] border-none px-2 py-1.5 text-xs font-mono text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-white/30"
                                value={toPhoneNumber}
                                onChange={(e) => {
                                    setToPhoneNumber(e.target.value);
                                    data.toPhoneNumber = e.target.value;
                                }}
                                placeholder="e.g. +15558675310 or {{params.toPhoneNumber}}"
                            />
                            <p className="mt-1 text-[10px] text-white/50">Recipient's phone number.</p>
                        </div>
                        <div>
                            <label htmlFor={`message-body-${id}`} className="mb-1 block text-xs font-medium text-white/50">Message Body</label>
                            <textarea
                                id={`message-body-${id}`}
                                className="w-full rounded-lg bg-[#222222] border-none px-2 py-1.5 text-xs font-mono text-white placeholder-white/30 min-h-[80px] focus:outline-none focus:ring-1 focus:ring-white/30"
                                value={messageBody}
                                onChange={(e) => {
                                    setMessageBody(e.target.value);
                                    data.messageBody = e.target.value;
                                }}
                                placeholder="Enter your message here."
                            />
                        </div>
                        <div className="space-y-1">
                            <label htmlFor={`account-sid-${id}`} className="mb-1 block text-xs font-medium text-white/50">Account SID Secret Name</label>
                            <input
                                id={`account-sid-${id}`}
                                type="text"
                                className="w-full rounded-lg bg-[#222222] border-none px-2 py-1.5 text-xs font-mono text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-white/30"
                                value={accountSidSecretName}
                                onChange={(e) => {
                                    setAccountSidSecretName(e.target.value);
                                    data.accountSidSecretName = e.target.value;
                                }}
                                placeholder="TWILIO_ACCOUNT_SID"
                            />
                            <p className="mt-1 text-[10px] text-white/50">Name of the secret for Twilio Account SID (e.g., created in Secrets Manager).</p>
                        </div>
                        <div className="space-y-1">
                            <label htmlFor={`auth-token-${id}`} className="mb-1 block text-xs font-medium text-white/50">Auth Token Secret Name</label>
                            <input
                                id={`auth-token-${id}`}
                                type="text"
                                className="w-full rounded-lg bg-[#222222] border-none px-2 py-1.5 text-xs font-mono text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-white/30"
                                value={authTokenSecretName}
                                onChange={(e) => {
                                    setAuthTokenSecretName(e.target.value);
                                    data.authTokenSecretName = e.target.value;
                                }}
                                placeholder="TWILIO_AUTH_TOKEN"
                            />
                            <p className="mt-1 text-[10px] text-white/50">Name of the secret for Twilio Auth Token.</p>
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

            <Handle
                type="source"
                position={Position.Bottom}
                className="!h-3 !w-3 !bg-[#F0EEE9]"
                style={{ border: '2px solid #131313' }}
            />
        </div>
    );
};

export default TwilioMessageNode;