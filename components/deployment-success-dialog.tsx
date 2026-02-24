'use client';

import React, { useState } from 'react';
import { X, CheckCircle, Copy, Code, Terminal, FileJson, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

interface DeploymentSuccessDialogProps {
    open: boolean;
    onClose: () => void;
    result: {
        version: number;
        workflowId: string;
        workflowName: string;
        code: string;
        graphJson: string;
    } | null;
}

export function DeploymentSuccessDialog({ open, onClose, result }: DeploymentSuccessDialogProps) {
    const [activeTab, setActiveTab] = useState<'overview' | 'code' | 'json'>('overview');

    if (!open || !result) return null;

    const webhookUrl = `${window.location.origin}/api/webhooks/${result.workflowId}`;
    const copyToClipboard = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        toast.success(`${label} copied to clipboard`);
    };

    return (
        <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="flex h-[600px] w-[800px] flex-col overflow-hidden rounded-xl border bg-[#141419] shadow-2xl" style={{ borderColor: 'var(--border-color)' }}>
                {/* Header */}
                <div className="flex items-center justify-between border-b px-6 py-4" style={{ borderColor: 'var(--border-color)' }}>
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/12 text-white">
                            <CheckCircle size={20} />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-white">Deployment Successful</h2>
                            <p className="text-sm text-gray-400">Version {result.version} is now live</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="rounded-lg p-2 text-gray-400 hover:bg-white/5 hover:text-white" title="Close deployment dialog">
                        <X size={20} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b px-6" style={{ borderColor: 'var(--border-color)' }}>
                    <button
                        onClick={() => setActiveTab('overview')}
                        className={`border-b-2 px-4 py-3 text-sm font-medium transition-colors ${activeTab === 'overview'
                                ? 'border-white text-white'
                                : 'border-transparent text-gray-400 hover:text-white'
                            }`}
                        title="View webhook and runtime integration instructions"
                    >
                        Integration
                    </button>
                    <button
                        onClick={() => setActiveTab('json')}
                        className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${activeTab === 'json'
                                ? 'border-white text-white'
                                : 'border-transparent text-gray-400 hover:text-white'
                            }`}
                        title="View serialized workflow graph JSON"
                    >
                        <FileJson size={14} />
                        Graph JSON
                    </button>
                    <button
                        onClick={() => setActiveTab('code')}
                        className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${activeTab === 'code'
                                ? 'border-white text-white'
                                : 'border-transparent text-gray-400 hover:text-white'
                            }`}
                        title="View compiled workflow TypeScript output"
                    >
                        <Code size={14} />
                        Compiled Code
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto bg-[#0A0A0C] p-6">
                    {activeTab === 'overview' && (
                        <div className="space-y-8">
                            {/* Webhook Section */}
                            <div className="space-y-3">
                                <h3 className="flex items-center gap-2 text-sm font-medium text-white">
                                    <Terminal size={16} className="text-white/85" />
                                    Webhook Trigger
                                </h3>
                                <p className="text-sm text-gray-400">
                                    Trigger this workflow via HTTP POST request.
                                </p>
                                <div className="group relative flex items-center rounded-lg border border-white/10 bg-black/40 px-4 py-3 font-mono text-sm text-gray-300">
                                    <span className="mr-3 font-bold text-white/85">POST</span>
                                    <span className="truncate">{webhookUrl}</span>
                                    <button
                                        onClick={() => copyToClipboard(webhookUrl, 'Webhook URL')}
                                        className="absolute right-2 rounded-md bg-white/5 p-2 text-gray-400 opacity-0 transition-opacity hover:bg-white/10 hover:text-white group-hover:opacity-100"
                                        title="Copy webhook endpoint URL"
                                    >
                                        <Copy size={16} />
                                    </button>
                                </div>
                            </div>

                            {/* cURL Example */}
                            <div className="space-y-3">
                                <h3 className="text-sm font-medium text-white">cURL Example</h3>
                                <div className="group relative rounded-lg border border-white/10 bg-black/40 p-4 font-mono text-sm text-gray-300">
                                    <pre className="whitespace-pre-wrap break-all">
                                        {`curl -X POST "${webhookUrl}" \\
  -H "Content-Type: application/json" \\
  -d '{ "some": "data" }'`}
                                    </pre>
                                    <button
                                        onClick={() => copyToClipboard(`curl -X POST "${webhookUrl}" -H "Content-Type: application/json" -d '{ "some": "data" }'`, 'cURL command')}
                                        className="absolute right-2 top-2 rounded-md bg-white/5 p-2 text-gray-400 opacity-0 transition-opacity hover:bg-white/10 hover:text-white group-hover:opacity-100"
                                        title="Copy cURL example"
                                    >
                                        <Copy size={16} />
                                    </button>
                                </div>
                            </div>

                            <div className="rounded-lg border border-white/20 bg-white/8 p-4">
                                <h4 className="flex items-center gap-2 text-sm font-medium text-white/85">
                                    <ExternalLink size={16} />
                                    Autonomous Execution
                                </h4>
                                <p className="mt-1 text-xs text-gray-400">
                                    Your workflow is now stored in the database and can be triggered anytime without requiring a persistent server instance. The execution engine will handle it automatically.
                                </p>
                            </div>
                        </div>
                    )}

                    {activeTab === 'json' && (
                        <div className="h-full">
                            <div className="mb-2 flex items-center justify-between">
                                <p className="text-xs text-gray-400">The actual graph structure stored in Supabase.</p>
                                <button
                                    onClick={() => copyToClipboard(result.graphJson, 'JSON')}
                                    className="flex items-center gap-2 rounded-md bg-white/5 px-3 py-1.5 text-xs text-gray-300 hover:bg-white/10"
                                    title="Copy graph JSON"
                                >
                                    <Copy size={12} />
                                    Copy JSON
                                </button>
                            </div>
                            <pre className="h-[calc(100%-40px)] overflow-auto rounded-lg border border-white/10 bg-black/40 p-4 font-mono text-xs text-white/80">
                                {result.graphJson}
                            </pre>
                        </div>
                    )}

                    {activeTab === 'code' && (
                        <div className="h-full">
                            <div className="mb-2 flex items-center justify-between">
                                <p className="text-xs text-gray-400">Generated TypeScript representation (for reference).</p>
                                <button
                                    onClick={() => copyToClipboard(result.code, 'Code')}
                                    className="flex items-center gap-2 rounded-md bg-white/5 px-3 py-1.5 text-xs text-gray-300 hover:bg-white/10"
                                    title="Copy generated source code"
                                >
                                    <Copy size={12} />
                                    Copy Code
                                </button>
                            </div>
                            <pre className="h-[calc(100%-40px)] overflow-auto rounded-lg border border-white/10 bg-black/40 p-4 font-mono text-xs text-white/80">
                                {result.code}
                            </pre>
                        </div>
                    )}
                </div>

                <div className="border-t bg-[#0A0A0C] px-6 py-4" style={{ borderColor: 'var(--border-color)' }}>
                    <div className="flex justify-end">
                        <button
                            onClick={onClose}
                            className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-black hover:bg-gray-200"
                            title="Close deployment dialog and return to editor"
                        >
                            Done
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
