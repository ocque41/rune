'use client';

import React, { memo, useState } from 'react';
import { Handle, Position, Node, NodeProps } from '@xyflow/react';
import { Play, Settings, AlertCircle, Clock, X, ChevronDown, Plus, Check } from 'lucide-react';
import { VerifiedSendersDrawer } from '../verified-senders-drawer';

export type StepNodeData = {
    label: string;
    description?: string;
    status?: 'idle' | 'running' | 'completed' | 'failed' | 'success' | 'failure';
    duration?: string; // For Sleep nodes
    httpRequest?: {
        method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
        url: string;
        headers?: string; // JSON string
        body?: string;    // JSON string
    };
    emailConfig?: {
        recipient: string;
        sender?: string; // Optional custom sender
        subject: string;
        body: string;
    };
    dbConfig?: {
        dbType?: 'postgres' | 'mysql' | 'mongodb' | 'generic';
        connectionString: string;
        query: string;
    };
    scriptConfig?: {
        code: string;
    };
    slackConfig?: {
        webhookUrl: string;
        channel?: string;
        message: string;
    };
    streamConfig?: {
        message: string;
    };
    waitConfig?: {
        event: string;
        timeout?: string;
    };
    idempotencyKey?: string;
    config?: {
        retryAfter?: string; // e.g. "1m"
        timeout?: string;    // e.g. "5m"
    };
    errorConfig?: {
        maxRetries?: number;        // 0-10, default 3
        backoffPolicy?: 'exponential' | 'linear' | 'constant';  // default 'exponential'
        baseDelay?: string;         // e.g. "1s", default "1s"
        failureAction?: 'retry' | 'fail-workflow' | 'ignore';  // default 'retry'
        errorTypeHandling?: 'all-retryable' | 'custom';  // default 'all-retryable'
        fatalErrorPatterns?: string[]; // List of error message patterns that should trigger fatal error
        timeout?: string;           // e.g. "5m"
    };
    webhookConfig?: {
        endpointSlug: string;
    };
    scheduleConfig?: {
        cronExpression: string;
    };
    transformConfig?: {
        expression: string;
    };
    aiConfig?: {
        provider: 'openai' | 'gemini' | 'generic';
        model: string;
        promptTemplate: string;
    };
};

export type CustomNode = Node<StepNodeData>;

import { NodeWrapper } from './node-wrapper';

export default function StepNode({ data, selected }: NodeProps<CustomNode>) {
    const [showConfig, setShowConfig] = useState(false);
    // ... (rest of state definitions remain the same)
    const [duration, setDuration] = useState<string>(data.duration || '5s');
    const [httpRequest, setHttpRequest] = useState<NonNullable<StepNodeData['httpRequest']>>(data.httpRequest || {
        method: 'GET',
        url: '',
        headers: '{}',
        body: '{}'
    });
    const [emailConfig, setEmailConfig] = useState<NonNullable<StepNodeData['emailConfig']>>(data.emailConfig || {
        recipient: '',
        sender: '',
        subject: '',
        body: ''
    });
    const [dbConfig, setDbConfig] = useState<NonNullable<StepNodeData['dbConfig']>>(data.dbConfig || {
        dbType: 'postgres',
        connectionString: '',
        query: ''
    });
    const [scriptConfig, setScriptConfig] = useState<NonNullable<StepNodeData['scriptConfig']>>(data.scriptConfig || {
        code: ''
    });
    const [slackConfig, setSlackConfig] = useState<NonNullable<StepNodeData['slackConfig']>>(data.slackConfig || {
        webhookUrl: '',
        channel: '',
        message: ''
    });
    const [streamConfig, setStreamConfig] = useState<NonNullable<StepNodeData['streamConfig']>>(data.streamConfig || {
        message: ''
    });
    const [waitConfig, setWaitConfig] = useState<NonNullable<StepNodeData['waitConfig']>>(data.waitConfig || {
        event: '',
        timeout: ''
    });
    const [idempotencyKey, setIdempotencyKey] = useState<string>(data.idempotencyKey || '');
    const [config, setConfig] = useState<NonNullable<StepNodeData['config']>>(data.config || {});
    const [errorConfig, setErrorConfig] = useState<NonNullable<StepNodeData['errorConfig']>>(data.errorConfig || {
        maxRetries: 3,
        backoffPolicy: 'exponential',
        baseDelay: '1s',
        failureAction: 'retry',
        errorTypeHandling: 'all-retryable',
        fatalErrorPatterns: [],
        timeout: ''
    });
    const [webhookConfig, setWebhookConfig] = useState<NonNullable<StepNodeData['webhookConfig']>>(data.webhookConfig || {
        endpointSlug: ''
    });
    const [scheduleConfig, setScheduleConfig] = useState<NonNullable<StepNodeData['scheduleConfig']>>(data.scheduleConfig || {
        cronExpression: ''
    });
    const [transformConfig, setTransformConfig] = useState<NonNullable<StepNodeData['transformConfig']>>(data.transformConfig || {
        expression: ''
    });
    const [aiConfig, setAiConfig] = useState<NonNullable<StepNodeData['aiConfig']>>(data.aiConfig || {
        provider: 'generic',
        model: 'gpt-4o',
        promptTemplate: ''
    });

    // Email Verified Senders State
    const [isSendersDrawerOpen, setIsSendersDrawerOpen] = useState(false);
    const [verifiedSenders, setVerifiedSenders] = useState<{ email: string; status: string }[]>([]);

    const fetchVerifiedSenders = async () => {
        try {
            const res = await fetch('/api/settings/email/list');
            if (res.ok) {
                const data = await res.json();
                setVerifiedSenders(data.senders || []);
            }
        } catch (e) {
            console.error('Failed to fetch verified senders', e);
        }
    };

    // Auto-fetch on mount if it's an email node
    const isEmailNode = data.label === 'Send Email';
    React.useEffect(() => {
        if (isEmailNode && showConfig) {
            fetchVerifiedSenders();
        }
    }, [isEmailNode, showConfig]);

    const handleConfigChange = (key: keyof NonNullable<StepNodeData['config']>, value: string) => {
        const newConfig = { ...config, [key]: value };
        setConfig(newConfig);
        data.config = newConfig;
    };

    const handleErrorConfigChange = (key: keyof NonNullable<StepNodeData['errorConfig']>, value: string | number | string[]) => {
        const newConfig = { ...errorConfig, [key]: value };
        setErrorConfig(newConfig);
        data.errorConfig = newConfig;
    };

    return (
        <NodeWrapper
            selected={selected}
            handles={[
                { type: 'target', position: Position.Top },
                { type: 'source', position: Position.Bottom }
            ]}
            className="min-w-[280px]" // Slightly wider for better readability
        >
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 bg-white/5">
                <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white/70 ring-1 ring-white/20">
                        {data.label === 'Sleep' || data.label === 'Wait for Event' ? <Clock size={16} /> : <Play size={16} />}
                    </div>
                    <span className="text-sm font-semibold text-white/90 tracking-wide">
                        {data.label}
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
                {data.description && (
                    <p className="text-xs text-white/50 leading-relaxed font-medium">
                        {data.description}
                    </p>
                )}

                {showConfig && (
                    <div
                        className="max-h-[320px] overflow-y-auto pr-2 space-y-4 nodrag custom-scrollbar"
                        onWheelCapture={(e) => e.stopPropagation()}
                    >
                        {/* Duration input for Sleep nodes */}
                        {data.label === 'Sleep' && (
                            <div className="space-y-1.5">
                                <label className="text-[10px] uppercase tracking-wider font-bold text-white/30">
                                    Duration
                                </label>
                                <input
                                    type="text"
                                    placeholder="e.g. 2s, 1m"
                                    className="w-full rounded-lg bg-[#222222] border-none px-3 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-white/30 transition-colors"
                                    value={duration}
                                    onChange={(e) => {
                                        setDuration(e.target.value);
                                        data.duration = e.target.value;
                                    }}
                                />
                            </div>
                        )}

                        {/* HTTP Request Configuration */}
                        {data.label === 'HTTP Request' && (
                            <div className="space-y-3">
                                <div className="grid grid-cols-[80px_1fr] gap-2">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] uppercase tracking-wider font-bold text-white/30">Method</label>
                                        <select
                                            className="w-full rounded-lg bg-[#222222] border-none px-2 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-white/30 transition-colors"
                                            value={httpRequest.method}
                                            onChange={(e) => {
                                                const newVal = { ...httpRequest, method: e.target.value as any };
                                                setHttpRequest(newVal);
                                                data.httpRequest = newVal;
                                            }}
                                        >
                                            {['GET', 'POST', 'PUT', 'DELETE', 'PATCH'].map(m => (
                                                <option key={m} value={m}>{m}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] uppercase tracking-wider font-bold text-white/30">URL</label>
                                        <input
                                            type="text"
                                            placeholder="https://api..."
                                            className="w-full rounded-lg bg-[#222222] border-none px-3 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-white/30 transition-colors"
                                            value={httpRequest.url}
                                            onChange={(e) => {
                                                const newVal = { ...httpRequest, url: e.target.value };
                                                setHttpRequest(newVal);
                                                data.httpRequest = newVal;
                                            }}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] uppercase tracking-wider font-bold text-white/30">Headers</label>
                                    <textarea
                                        className="w-full rounded-lg bg-[#222222] border-none px-3 py-2 text-xs font-mono text-white/80 placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-white/30 transition-colors"
                                        rows={2}
                                        placeholder='{"Content-Type": "application/json"}'
                                        value={httpRequest.headers}
                                        onChange={(e) => {
                                            const newVal = { ...httpRequest, headers: e.target.value };
                                            setHttpRequest(newVal);
                                            data.httpRequest = newVal;
                                        }}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] uppercase tracking-wider font-bold text-white/30">Body</label>
                                    <textarea
                                        className="w-full rounded-lg bg-[#222222] border-none px-3 py-2 text-xs font-mono text-white/80 placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-white/30 transition-colors"
                                        rows={3}
                                        placeholder='{"key": "value"}'
                                        value={httpRequest.body}
                                        onChange={(e) => {
                                            const newVal = { ...httpRequest, body: e.target.value };
                                            setHttpRequest(newVal);
                                            data.httpRequest = newVal;
                                        }}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Slack Config */}
                        {data.label === 'Slack Message' && (
                            <div className="space-y-3">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] uppercase tracking-wider font-bold text-white/30">Webhook URL</label>
                                    <input
                                        type="text"
                                        placeholder="https://hooks.slack.com/..."
                                        className="w-full rounded-lg bg-[#222222] border-none px-3 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-white/30 transition-colors"
                                        value={slackConfig.webhookUrl}
                                        onChange={(e) => {
                                            const newVal = { ...slackConfig, webhookUrl: e.target.value };
                                            setSlackConfig(newVal);
                                            data.slackConfig = newVal;
                                        }}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] uppercase tracking-wider font-bold text-white/30">Channel (Optional)</label>
                                    <input
                                        type="text"
                                        placeholder="#general"
                                        className="w-full rounded-lg bg-[#222222] border-none px-3 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-white/30 transition-colors"
                                        value={slackConfig.channel}
                                        onChange={(e) => {
                                            const newVal = { ...slackConfig, channel: e.target.value };
                                            setSlackConfig(newVal);
                                            data.slackConfig = newVal;
                                        }}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] uppercase tracking-wider font-bold text-white/30">Message</label>
                                    <textarea
                                        className="w-full rounded-lg bg-[#222222] border-none px-3 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-white/30 transition-colors"
                                        rows={2}
                                        value={slackConfig.message}
                                        onChange={(e) => {
                                            const newVal = { ...slackConfig, message: e.target.value };
                                            setSlackConfig(newVal);
                                            data.slackConfig = newVal;
                                        }}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Send Email Config */}
                        {data.label === 'Send Email' && (
                            <div className="space-y-3">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] uppercase tracking-wider font-bold text-white/30">Recipient</label>
                                    <input
                                        type="email"
                                        placeholder="user@example.com"
                                        className="w-full rounded-lg bg-[#222222] border-none px-3 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-white/30 transition-colors"
                                        value={emailConfig.recipient}
                                        onChange={(e) => {
                                            const newVal = { ...emailConfig, recipient: e.target.value };
                                            setEmailConfig(newVal);
                                            data.emailConfig = newVal;
                                        }}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] uppercase tracking-wider font-bold text-white/30">From (Verified)</label>
                                    <div className="relative">
                                        <select
                                            className="w-full appearance-none rounded-lg bg-[#222222] border-none px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-white/30 transition-colors pr-8"
                                            value={emailConfig.sender || ''}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                if (val === '__add_new__') {
                                                    setIsSendersDrawerOpen(true);
                                                    return;
                                                }
                                                const newVal = { ...emailConfig, sender: val };
                                                setEmailConfig(newVal);
                                                data.emailConfig = newVal;
                                            }}
                                        >
                                            <option value="">Default (System Address)</option>
                                            {verifiedSenders.filter(s => s.status === 'verified').map(s => (
                                                <option key={s.email} value={s.email}>
                                                    {s.email}
                                                </option>
                                            ))}
                                            <option value="__add_new__">+ Add New Verified Sender...</option>
                                        </select>
                                        <ChevronDown className="absolute right-2 top-2.5 text-white/30 pointer-events-none" size={14} />
                                    </div>
                                    <div
                                        onClick={() => setIsSendersDrawerOpen(true)}
                                        className="text-[10px] text-blue-400 hover:underline cursor-pointer flex items-center gap-1 mt-1"
                                    >
                                        <Settings size={10} /> Manage Verified Senders
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] uppercase tracking-wider font-bold text-white/30">Subject</label>
                                    <input
                                        type="text"
                                        placeholder="Subject line"
                                        className="w-full rounded-lg bg-[#222222] border-none px-3 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-white/30 transition-colors"
                                        value={emailConfig.subject}
                                        onChange={(e) => {
                                            const newVal = { ...emailConfig, subject: e.target.value };
                                            setEmailConfig(newVal);
                                            data.emailConfig = newVal;
                                        }}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] uppercase tracking-wider font-bold text-white/30">Body</label>
                                    <textarea
                                        className="w-full rounded-lg bg-[#222222] border-none px-3 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-white/30 transition-colors"
                                        rows={4}
                                        value={emailConfig.body}
                                        onChange={(e) => {
                                            const newVal = { ...emailConfig, body: e.target.value };
                                            setEmailConfig(newVal);
                                            data.emailConfig = newVal;
                                        }}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Database Query Config */}
                        {data.label === 'Database Query' && (
                            <div className="space-y-3">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] uppercase tracking-wider font-bold text-white/30">Database Type</label>
                                    <select
                                        className="w-full rounded-lg bg-[#222222] border-none px-2 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-white/30 transition-colors"
                                        value={dbConfig.dbType}
                                        onChange={(e) => {
                                            const newVal = { ...dbConfig, dbType: e.target.value as any };
                                            setDbConfig(newVal);
                                            data.dbConfig = newVal;
                                        }}
                                    >
                                        <option value="postgres">PostgreSQL</option>
                                        <option value="mysql">MySQL</option>
                                        <option value="mongodb">MongoDB</option>
                                        <option value="generic">Generic</option>
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] uppercase tracking-wider font-bold text-white/30">Connection String</label>
                                    <input
                                        type="text"
                                        placeholder="postgresql://user:pass@localhost:5432/db"
                                        className="w-full rounded-lg bg-[#222222] border-none px-3 py-2 text-xs font-mono text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-white/30 transition-colors"
                                        value={dbConfig.connectionString}
                                        onChange={(e) => {
                                            const newVal = { ...dbConfig, connectionString: e.target.value };
                                            setDbConfig(newVal);
                                            data.dbConfig = newVal;
                                        }}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] uppercase tracking-wider font-bold text-white/30">Query</label>
                                    <textarea
                                        className="w-full rounded-lg bg-[#222222] border-none px-3 py-2 text-xs font-mono text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-white/30 transition-colors"
                                        rows={4}
                                        placeholder="SELECT * FROM users WHERE id = $1"
                                        value={dbConfig.query}
                                        onChange={(e) => {
                                            const newVal = { ...dbConfig, query: e.target.value };
                                            setDbConfig(newVal);
                                            data.dbConfig = newVal;
                                        }}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Run Script Config */}
                        {data.label === 'Run Script' && (
                            <div className="space-y-3">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] uppercase tracking-wider font-bold text-white/30">Script (Node.js)</label>
                                    <textarea
                                        className="w-full rounded-lg bg-[#222222] border-none px-3 py-2 text-xs font-mono text-blue-300 placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-white/30 transition-colors"
                                        rows={6}
                                        placeholder="// console.log('Hello World');"
                                        value={scriptConfig.code}
                                        onChange={(e) => {
                                            const newVal = { ...scriptConfig, code: e.target.value };
                                            setScriptConfig(newVal);
                                            data.scriptConfig = newVal;
                                        }}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Stream Config */}
                        {data.label === 'Stream' && (
                            <div className="space-y-3">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] uppercase tracking-wider font-bold text-white/30">Stream Message</label>
                                    <textarea
                                        className="w-full rounded-lg bg-[#222222] border-none px-3 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-white/30 transition-colors"
                                        rows={2}
                                        value={streamConfig.message}
                                        onChange={(e) => {
                                            const newVal = { ...streamConfig, message: e.target.value };
                                            setStreamConfig(newVal);
                                            data.streamConfig = newVal;
                                        }}
                                    />
                                </div>
                            </div>
                        )}

                        {/* AI Config */}
                        {data.label === 'AI Generation' && (
                            <div className="space-y-3">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] uppercase tracking-wider font-bold text-white/30">Prompt</label>
                                    <textarea
                                        className="w-full rounded-lg bg-[#222222] border-none px-3 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-white/30 transition-colors"
                                        rows={3}
                                        value={aiConfig.promptTemplate}
                                        onChange={(e) => {
                                            const newVal = { ...aiConfig, promptTemplate: e.target.value };
                                            setAiConfig(newVal);
                                            data.aiConfig = newVal;
                                        }}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {data.status && data.status !== 'idle' && (
                    <div className="pt-3 border-t border-white/5 flex items-center gap-2">
                        <div className={`h-2 w-2 rounded-full ${data.status === 'running' ? 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)] animate-pulse' :
                            (data.status === 'completed' || data.status === 'success') ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' :
                                (data.status === 'failed' || data.status === 'failure') ? 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]' :
                                    'bg-white/30' // Default for unknown/idle
                            }`} />
                        <span className={`text-[10px] uppercase tracking-wider font-bold ${data.status === 'running' ? 'text-blue-400' :
                            (data.status === 'completed' || data.status === 'success') ? 'text-green-400' :
                                (data.status === 'failed' || data.status === 'failure') ? 'text-red-400' :
                                    'text-white/50' // Default for unknown/idle
                            }`}>
                            {data.status}
                        </span>
                    </div>
                )}
            </div>

            <VerifiedSendersDrawer
                isOpen={isSendersDrawerOpen}
                onClose={() => setIsSendersDrawerOpen(false)}
                onSenderVerified={() => {
                    fetchVerifiedSenders();
                    // Optionally auto-select the new one? Simple refresh is enough for now.
                }}
            />
        </NodeWrapper >
    );
}


