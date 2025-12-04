'use client';

import React, { memo, useState } from 'react';
import { Handle, Position, Node, NodeProps } from '@xyflow/react';
import { Play, Settings, AlertCircle, Clock, X } from 'lucide-react';

export type StepNodeData = {
    label: string;
    description?: string;
    status?: 'idle' | 'running' | 'completed' | 'failed';
    duration?: string; // For Sleep nodes
    httpRequest?: {
        method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
        url: string;
        headers?: string; // JSON string
        body?: string;    // JSON string
    };
    emailConfig?: {
        recipient: string;
        subject: string;
        body: string;
    };
    dbConfig?: {
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
};

export type CustomNode = Node<StepNodeData>;

const StepNode = ({ data, selected }: NodeProps<CustomNode>) => {
    const [showConfig, setShowConfig] = useState(false);
    const [duration, setDuration] = useState<string>(data.duration || '5s');
    const [httpRequest, setHttpRequest] = useState<NonNullable<StepNodeData['httpRequest']>>(data.httpRequest || {
        method: 'GET',
        url: '',
        headers: '{}',
        body: '{}'
    });
    const [emailConfig, setEmailConfig] = useState<NonNullable<StepNodeData['emailConfig']>>(data.emailConfig || {
        recipient: '',
        subject: '',
        body: ''
    });
    const [dbConfig, setDbConfig] = useState<NonNullable<StepNodeData['dbConfig']>>(data.dbConfig || {
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
    // Ensure config is treated as an object, defaulting to empty object if undefined
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

    const handleConfigChange = (key: keyof NonNullable<StepNodeData['config']>, value: string) => {
        const newConfig = { ...config, [key]: value };
        setConfig(newConfig);
        // In a real app, we'd propagate this change up to the flow state
        data.config = newConfig;
    };

    const handleErrorConfigChange = (key: keyof NonNullable<StepNodeData['errorConfig']>, value: string | number | string[]) => {
        const newConfig = { ...errorConfig, [key]: value };
        setErrorConfig(newConfig);
        data.errorConfig = newConfig;
    };

    return (
        <div
            className={`min-w-[220px] rounded-lg border transition-all ${selected ? 'ring-2' : ''
                }`}
            style={{
                backgroundColor: 'var(--node-background)',
                borderColor: selected ? 'var(--foreground-subtitle)' : 'var(--border-color)',
                '--tw-ring-color': selected ? 'var(--foreground-subtitle)' : 'transparent'
            } as React.CSSProperties}
        >
            <div className="flex items-center justify-between border-b px-3 py-2" style={{
                backgroundColor: 'var(--accent-bg)',
                borderColor: 'var(--border-color)'
            }}>
                <div className="flex items-center gap-2">
                    <div className="flex h-6 w-6 items-center justify-center rounded" style={{
                        backgroundColor: 'var(--background)',
                        color: 'var(--foreground-subtitle)'
                    }}>
                        {data.label === 'Sleep' || data.label === 'Wait for Event' ? <Clock size={12} /> : <Play size={12} />}
                    </div>
                    <span className="text-sm font-medium" style={{
                        color: 'var(--foreground-body)',
                        letterSpacing: '-0.02em'
                    }}>
                        {data.label}
                    </span>
                </div>
                <button
                    onClick={() => setShowConfig(!showConfig)}
                    className="rounded p-1 transition-colors"
                    style={{
                        color: 'var(--foreground-subtitle)'
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--background)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                >
                    <Settings size={14} />
                </button>
            </div>

            <div className="p-3">
                {data.description && (
                    <p className="mb-2 text-xs" style={{
                        color: 'var(--foreground-subtitle)',
                        letterSpacing: '-0.01em',
                        opacity: 0.8
                    }}>
                        {data.description}
                    </p>
                )}

                {/* Duration input for Sleep nodes - shown prominently */}
                {data.label === 'Sleep' && (
                    <div className="mb-2">
                        <label className="mb-1 block text-xs font-medium" style={{ color: 'var(--foreground-body)' }}>
                            Duration
                        </label>
                        <input
                            type="text"
                            placeholder="e.g. 2s, 1m, 30s"
                            className="w-full rounded border px-2 py-1 text-sm"
                            style={{
                                backgroundColor: 'var(--accent-bg)',
                                borderColor: 'var(--border-color)',
                                color: 'var(--foreground-body)'
                            }}
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
                    <div className="mb-2 space-y-2">
                        <div>
                            <label className="mb-1 block text-xs font-medium" style={{ color: 'var(--foreground-body)' }}>Method</label>
                            <select
                                className="w-full rounded border px-2 py-1 text-sm"
                                style={{
                                    backgroundColor: 'var(--accent-bg)',
                                    borderColor: 'var(--border-color)',
                                    color: 'var(--foreground-body)'
                                }}
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
                        <div>
                            <label className="mb-1 block text-xs font-medium" style={{ color: 'var(--foreground-body)' }}>URL</label>
                            <input
                                type="text"
                                placeholder="https://api.example.com"
                                className="w-full rounded border px-2 py-1 text-sm"
                                style={{
                                    backgroundColor: 'var(--accent-bg)',
                                    borderColor: 'var(--border-color)',
                                    color: 'var(--foreground-body)'
                                }}
                                value={httpRequest.url}
                                onChange={(e) => {
                                    const newVal = { ...httpRequest, url: e.target.value };
                                    setHttpRequest(newVal);
                                    data.httpRequest = newVal;
                                }}
                            />
                        </div>
                        {showConfig && (
                            <>
                                <div>
                                    <label className="mb-1 block text-xs font-medium" style={{ color: 'var(--foreground-body)' }}>Headers (JSON)</label>
                                    <textarea
                                        className="w-full rounded border px-2 py-1 text-sm font-mono"
                                        rows={2}
                                        placeholder='{"Content-Type": "application/json"}'
                                        style={{
                                            backgroundColor: 'var(--accent-bg)',
                                            borderColor: 'var(--border-color)',
                                            color: 'var(--foreground-body)'
                                        }}
                                        value={httpRequest.headers}
                                        onChange={(e) => {
                                            const newVal = { ...httpRequest, headers: e.target.value };
                                            setHttpRequest(newVal);
                                            data.httpRequest = newVal;
                                        }}
                                    />
                                </div>
                                <div>
                                    <label className="mb-1 block text-xs font-medium" style={{ color: 'var(--foreground-body)' }}>Body (JSON)</label>
                                    <textarea
                                        className="w-full rounded border px-2 py-1 text-sm font-mono"
                                        rows={3}
                                        placeholder='{"key": "value"}'
                                        style={{
                                            backgroundColor: 'var(--accent-bg)',
                                            borderColor: 'var(--border-color)',
                                            color: 'var(--foreground-body)'
                                        }}
                                        value={httpRequest.body}
                                        onChange={(e) => {
                                            const newVal = { ...httpRequest, body: e.target.value };
                                            setHttpRequest(newVal);
                                            data.httpRequest = newVal;
                                        }}
                                    />
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* Send Email Configuration */}
                {data.label === 'Send Email' && (
                    <div className="mb-2 space-y-2">
                        <div>
                            <label className="mb-1 block text-xs font-medium" style={{ color: 'var(--foreground-body)' }}>Recipient</label>
                            <input
                                type="email"
                                placeholder="user@example.com"
                                className="w-full rounded border px-2 py-1 text-sm"
                                style={{
                                    backgroundColor: 'var(--accent-bg)',
                                    borderColor: 'var(--border-color)',
                                    color: 'var(--foreground-body)'
                                }}
                                value={emailConfig.recipient}
                                onChange={(e) => {
                                    const newVal = { ...emailConfig, recipient: e.target.value };
                                    setEmailConfig(newVal);
                                    data.emailConfig = newVal;
                                }}
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-medium" style={{ color: 'var(--foreground-body)' }}>Subject</label>
                            <input
                                type="text"
                                placeholder="Email Subject"
                                className="w-full rounded border px-2 py-1 text-sm"
                                style={{
                                    backgroundColor: 'var(--accent-bg)',
                                    borderColor: 'var(--border-color)',
                                    color: 'var(--foreground-body)'
                                }}
                                value={emailConfig.subject}
                                onChange={(e) => {
                                    const newVal = { ...emailConfig, subject: e.target.value };
                                    setEmailConfig(newVal);
                                    data.emailConfig = newVal;
                                }}
                            />
                        </div>
                        {showConfig && (
                            <div>
                                <label className="mb-1 block text-xs font-medium" style={{ color: 'var(--foreground-body)' }}>Body</label>
                                <textarea
                                    className="w-full rounded border px-2 py-1 text-sm font-mono"
                                    rows={3}
                                    placeholder="Email content..."
                                    style={{
                                        backgroundColor: 'var(--accent-bg)',
                                        borderColor: 'var(--border-color)',
                                        color: 'var(--foreground-body)'
                                    }}
                                    value={emailConfig.body}
                                    onChange={(e) => {
                                        const newVal = { ...emailConfig, body: e.target.value };
                                        setEmailConfig(newVal);
                                        data.emailConfig = newVal;
                                    }}
                                />
                            </div>
                        )}
                    </div>
                )}

                {/* Database Query Configuration */}
                {data.label === 'Database Query' && (
                    <div className="mb-2 space-y-2">
                        <div>
                            <label className="mb-1 block text-xs font-medium" style={{ color: 'var(--foreground-body)' }}>Connection String</label>
                            <input
                                type="text"
                                placeholder="postgresql://user:pass@localhost:5432/db"
                                className="w-full rounded border px-2 py-1 text-sm"
                                style={{
                                    backgroundColor: 'var(--accent-bg)',
                                    borderColor: 'var(--border-color)',
                                    color: 'var(--foreground-body)'
                                }}
                                value={dbConfig.connectionString}
                                onChange={(e) => {
                                    const newVal = { ...dbConfig, connectionString: e.target.value };
                                    setDbConfig(newVal);
                                    data.dbConfig = newVal;
                                }}
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-medium" style={{ color: 'var(--foreground-body)' }}>SQL Query</label>
                            <textarea
                                className="w-full rounded border px-2 py-1 text-sm font-mono"
                                rows={3}
                                placeholder="SELECT * FROM users;"
                                style={{
                                    backgroundColor: 'var(--accent-bg)',
                                    borderColor: 'var(--border-color)',
                                    color: 'var(--foreground-body)'
                                }}
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

                {/* Run Script Configuration */}
                {data.label === 'Run Script' && (
                    <div className="mb-2">
                        <label className="mb-1 block text-xs font-medium" style={{ color: 'var(--foreground-body)' }}>JavaScript Code</label>
                        <textarea
                            className="w-full rounded border px-2 py-1 text-sm font-mono"
                            rows={5}
                            placeholder="return params.previousStep.data + 1;"
                            style={{
                                backgroundColor: 'var(--accent-bg)',
                                borderColor: 'var(--border-color)',
                                color: 'var(--foreground-body)'
                            }}
                            value={scriptConfig.code}
                            onChange={(e) => {
                                const newVal = { ...scriptConfig, code: e.target.value };
                                setScriptConfig(newVal);
                                data.scriptConfig = newVal;
                            }}
                        />
                        <p className="mt-1 text-[10px] opacity-60" style={{ color: 'var(--foreground-body)' }}>
                            Available: <code>params</code>
                        </p>
                    </div>
                )}

                {/* Slack Message Configuration */}
                {data.label === 'Slack Message' && (
                    <div className="mb-2 space-y-2">
                        <div>
                            <label className="mb-1 block text-xs font-medium" style={{ color: 'var(--foreground-body)' }}>Webhook URL</label>
                            <input
                                type="text"
                                placeholder="https://hooks.slack.com/services/..."
                                className="w-full rounded border px-2 py-1 text-sm"
                                style={{
                                    backgroundColor: 'var(--accent-bg)',
                                    borderColor: 'var(--border-color)',
                                    color: 'var(--foreground-body)'
                                }}
                                value={slackConfig.webhookUrl}
                                onChange={(e) => {
                                    const newVal = { ...slackConfig, webhookUrl: e.target.value };
                                    setSlackConfig(newVal);
                                    data.slackConfig = newVal;
                                }}
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-medium" style={{ color: 'var(--foreground-body)' }}>Channel (Optional)</label>
                            <input
                                type="text"
                                placeholder="#general"
                                className="w-full rounded border px-2 py-1 text-sm"
                                style={{
                                    backgroundColor: 'var(--accent-bg)',
                                    borderColor: 'var(--border-color)',
                                    color: 'var(--foreground-body)'
                                }}
                                value={slackConfig.channel || ''}
                                onChange={(e) => {
                                    const newVal = { ...slackConfig, channel: e.target.value };
                                    setSlackConfig(newVal);
                                    data.slackConfig = newVal;
                                }}
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-medium" style={{ color: 'var(--foreground-body)' }}>Message</label>
                            <textarea
                                className="w-full rounded border px-2 py-1 text-sm font-mono"
                                rows={3}
                                placeholder="Hello from workflow!"
                                style={{
                                    backgroundColor: 'var(--accent-bg)',
                                    borderColor: 'var(--border-color)',
                                    color: 'var(--foreground-body)'
                                }}
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

                {/* Stream Configuration */}
                {data.label === 'Stream' && (
                    <div className="mb-2">
                        <label className="mb-1 block text-xs font-medium" style={{ color: 'var(--foreground-body)' }}>Message</label>
                        <textarea
                            className="w-full rounded border px-2 py-1 text-sm font-mono"
                            rows={3}
                            placeholder="Streaming update..."
                            style={{
                                backgroundColor: 'var(--accent-bg)',
                                borderColor: 'var(--border-color)',
                                color: 'var(--foreground-body)'
                            }}
                            value={streamConfig.message}
                            onChange={(e) => {
                                const newVal = { ...streamConfig, message: e.target.value };
                                setStreamConfig(newVal);
                                data.streamConfig = newVal;
                            }}
                        />
                    </div>
                )}

                {/* Wait for Event Configuration */}
                {data.label === 'Wait for Event' && (
                    <div className="mb-2 space-y-2">
                        <div>
                            <label className="mb-1 block text-xs font-medium" style={{ color: 'var(--foreground-body)' }}>Event Name</label>
                            <input
                                type="text"
                                placeholder="my-event"
                                className="w-full rounded border px-2 py-1 text-sm"
                                style={{
                                    backgroundColor: 'var(--accent-bg)',
                                    borderColor: 'var(--border-color)',
                                    color: 'var(--foreground-body)'
                                }}
                                value={waitConfig.event}
                                onChange={(e) => {
                                    const newVal = { ...waitConfig, event: e.target.value };
                                    setWaitConfig(newVal);
                                    data.waitConfig = newVal;
                                }}
                            />
                        </div>
                        <div>
                            <label className="mb-1 block text-xs font-medium" style={{ color: 'var(--foreground-body)' }}>Timeout (Optional)</label>
                            <input
                                type="text"
                                placeholder="1h"
                                className="w-full rounded border px-2 py-1 text-sm"
                                style={{
                                    backgroundColor: 'var(--accent-bg)',
                                    borderColor: 'var(--border-color)',
                                    color: 'var(--foreground-body)'
                                }}
                                value={waitConfig.timeout || ''}
                                onChange={(e) => {
                                    const newVal = { ...waitConfig, timeout: e.target.value };
                                    setWaitConfig(newVal);
                                    data.waitConfig = newVal;
                                }}
                            />
                        </div>
                    </div>
                )}

                {showConfig && (
                    <div className="mt-2 space-y-2 rounded p-2 text-xs" style={{
                        backgroundColor: 'var(--accent-bg)'
                    }}>
                        <div>
                            <label className="mb-1 block opacity-60" style={{ color: 'var(--foreground-body)' }}>Idempotency Key</label>
                            <input
                                type="text"
                                placeholder={`Default: ${data.label.toLowerCase().replace(/\s+/g, '-')}`}
                                className="w-full rounded border px-2 py-1"
                                style={{
                                    backgroundColor: 'var(--background)',
                                    borderColor: 'var(--border-color)',
                                    color: 'var(--foreground-body)'
                                }}
                                value={idempotencyKey}
                                onChange={(e) => {
                                    setIdempotencyKey(e.target.value);
                                    data.idempotencyKey = e.target.value;
                                }}
                            />
                        </div>
                        <div>
                            <label className="mb-1 block opacity-60" style={{ color: 'var(--foreground-body)' }}>Retry After</label>
                            <input
                                type="text"
                                placeholder="e.g. 1m"
                                className="w-full rounded border px-2 py-1"
                                style={{
                                    backgroundColor: 'var(--background)',
                                    borderColor: 'var(--border-color)',
                                    color: 'var(--foreground-body)'
                                }}
                                value={config.retryAfter || ''}
                                onChange={(e) => handleConfigChange('retryAfter', e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="mb-1 block opacity-60" style={{ color: 'var(--foreground-body)' }}>Timeout</label>
                            <input
                                type="text"
                                placeholder="e.g. 5m"
                                className="w-full rounded border px-2 py-1"
                                style={{
                                    backgroundColor: 'var(--background)',
                                    borderColor: 'var(--border-color)',
                                    color: 'var(--foreground-body)'
                                }}
                                value={config.timeout || ''}
                                onChange={(e) => handleConfigChange('timeout', e.target.value)}
                            />
                        </div>

                        {/* Error Handling Section */}
                        <div className="mt-3 pt-3 border-t space-y-2" style={{ borderColor: 'var(--border-color)' }}>
                            <div className="mb-2">
                                <span className="text-xs font-semibold opacity-70" style={{ color: 'var(--foreground-body)' }}>
                                    Error Handling & Retry
                                </span>
                            </div>

                            <div>
                                <label className="mb-1 block opacity-60" style={{ color: 'var(--foreground-body)' }}>Max Retries</label>
                                <input
                                    type="number"
                                    min="0"
                                    max="10"
                                    placeholder="3"
                                    className="w-full rounded border px-2 py-1"
                                    style={{
                                        backgroundColor: 'var(--background)',
                                        borderColor: 'var(--border-color)',
                                        color: 'var(--foreground-body)'
                                    }}
                                    value={errorConfig.maxRetries ?? 3}
                                    onChange={(e) => handleErrorConfigChange('maxRetries', parseInt(e.target.value) || 0)}
                                />
                            </div>

                            <div>
                                <label className="mb-1 block opacity-60" style={{ color: 'var(--foreground-body)' }}>Backoff Policy</label>
                                <select
                                    className="w-full rounded border px-2 py-1"
                                    style={{
                                        backgroundColor: 'var(--background)',
                                        borderColor: 'var(--border-color)',
                                        color: 'var(--foreground-body)'
                                    }}
                                    value={errorConfig.backoffPolicy || 'exponential'}
                                    onChange={(e) => handleErrorConfigChange('backoffPolicy', e.target.value)}
                                >
                                    <option value="exponential">Exponential (2^n × delay)</option>
                                    <option value="linear">Linear (n × delay)</option>
                                    <option value="constant">Constant (fixed delay)</option>
                                </select>
                            </div>

                            <div>
                                <label className="mb-1 block opacity-60" style={{ color: 'var(--foreground-body)' }}>Base Delay</label>
                                <input
                                    type="text"
                                    placeholder="e.g. 1s, 500ms"
                                    className="w-full rounded border px-2 py-1"
                                    style={{
                                        backgroundColor: 'var(--background)',
                                        borderColor: 'var(--border-color)',
                                        color: 'var(--foreground-body)'
                                    }}
                                    value={errorConfig.baseDelay || '1s'}
                                    onChange={(e) => handleErrorConfigChange('baseDelay', e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="mb-1 block opacity-60" style={{ color: 'var(--foreground-body)' }}>Failure Action</label>
                                <select
                                    className="w-full rounded border px-2 py-1"
                                    style={{
                                        backgroundColor: 'var(--background)',
                                        borderColor: 'var(--border-color)',
                                        color: 'var(--foreground-body)'
                                    }}
                                    value={errorConfig.failureAction || 'retry'}
                                    onChange={(e) => handleErrorConfigChange('failureAction', e.target.value)}
                                >
                                    <option value="retry">Retry (up to max retries)</option>
                                    <option value="fail-workflow">Fail Workflow</option>
                                    <option value="ignore">Ignore & Continue</option>
                                </select>
                            </div>

                            <div>
                                <label className="mb-1 block opacity-60" style={{ color: 'var(--foreground-body)' }}>Error Type Handling</label>
                                <select
                                    className="w-full rounded border px-2 py-1"
                                    style={{
                                        backgroundColor: 'var(--background)',
                                        borderColor: 'var(--border-color)',
                                        color: 'var(--foreground-body)'
                                    }}
                                    value={errorConfig.errorTypeHandling || 'all-retryable'}
                                    onChange={(e) => handleErrorConfigChange('errorTypeHandling', e.target.value)}
                                >
                                    <option value="all-retryable">All Errors Retryable</option>
                                    <option value="custom">Custom (Define Fatal Errors)</option>
                                </select>
                            </div>

                            {errorConfig.errorTypeHandling === 'custom' && (
                                <div>
                                    <label className="mb-1 block opacity-60" style={{ color: 'var(--foreground-body)' }}>Fatal Error Patterns</label>
                                    <textarea
                                        className="w-full rounded border px-2 py-1 text-sm font-mono"
                                        rows={3}
                                        placeholder="One pattern per line (e.g. '404', 'Unauthorized')"
                                        style={{
                                            backgroundColor: 'var(--background)',
                                            borderColor: 'var(--border-color)',
                                            color: 'var(--foreground-body)'
                                        }}
                                        value={(errorConfig.fatalErrorPatterns || []).join('\n')}
                                        onChange={(e) => handleErrorConfigChange('fatalErrorPatterns', e.target.value.split('\n').filter(s => s.trim() !== ''))}
                                    />
                                    <p className="mt-1 text-[10px] opacity-50" style={{ color: 'var(--foreground-body)' }}>
                                        Errors containing these strings will NOT be retried
                                    </p>
                                </div>
                            )}

                            <div>
                                <label className="mb-1 block opacity-60" style={{ color: 'var(--foreground-body)' }}>Step Timeout</label>
                                <input
                                    type="text"
                                    placeholder="e.g. 5m, 30s"
                                    className="w-full rounded border px-2 py-1"
                                    style={{
                                        backgroundColor: 'var(--background)',
                                        borderColor: 'var(--border-color)',
                                        color: 'var(--foreground-body)'
                                    }}
                                    value={errorConfig.timeout || ''}
                                    onChange={(e) => handleErrorConfigChange('timeout', e.target.value)}
                                />
                                <p className="mt-1 text-[10px] opacity-50" style={{ color: 'var(--foreground-body)' }}>
                                    Max time allowed for this step
                                </p>
                            </div>
                        </div>
                    </div>
                )}


                {data.status && data.status !== 'idle' && (
                    <div className="mt-2 flex items-center gap-1.5 text-xs">
                        <div className={`h-1.5 w-1.5 rounded-full ${data.status === 'running' ? 'bg-blue-500 animate-pulse' :
                            data.status === 'completed' ? 'bg-green-500' :
                                'bg-red-500'
                            }`} />
                        <span className="capitalize" style={{ color: 'var(--foreground-body)' }}>
                            {data.status}
                        </span>
                    </div>
                )}
            </div>

            <Handle
                type="target"
                position={Position.Top}
                className="!h-3 !w-3 !border-2 !transition-colors hover:!bg-blue-500"
                style={{
                    backgroundColor: 'var(--foreground)',
                    borderColor: 'var(--background)'
                }}
            />
            <Handle
                type="source"
                position={Position.Bottom}
                className="!h-3 !w-3 !border-2 !transition-colors hover:!bg-blue-500"
                style={{
                    backgroundColor: 'var(--foreground)',
                    borderColor: 'var(--background)'
                }}
            />
        </div>
    );
};

export default StepNode;
