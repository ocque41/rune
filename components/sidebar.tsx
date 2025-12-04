'use client';

import React, { useState, useEffect } from 'react';
import type { DragEvent } from 'react';
import { MessageSquare, Mail, Database, Globe, Clock, Code, PauseCircle, Split, Repeat, Lock, GitMerge, Workflow, Info, ChevronDown, UserCheck, Sparkles } from 'lucide-react';

export const Sidebar = () => {
    const [showSecrets, setShowSecrets] = useState(false);
    const [secrets, setSecrets] = useState<string[]>([]);
    const [secretsLoading, setSecretsLoading] = useState(true);
    const [secretsError, setSecretsError] = useState<string | null>(null);

    // Fetch available secrets on mount
    useEffect(() => {
        const fetchSecrets = async () => {
            try {
                const response = await fetch('/api/secrets/list');
                const data = await response.json();

                if (data.success) {
                    setSecrets(data.keys);
                } else {
                    setSecretsError(data.error || 'Failed to load secrets');
                }
            } catch (error) {
                console.error('Error fetching secrets:', error);
                setSecretsError('Failed to connect to secrets API');
            } finally {
                setSecretsLoading(false);
            }
        };

        fetchSecrets();
    }, []);
    const onDragStart = (event: DragEvent, nodeType: string, label: string) => {
        if (event.dataTransfer) {
            event.dataTransfer.setData('application/reactflow', nodeType);
            event.dataTransfer.setData('application/reactflow/label', label);
            event.dataTransfer.effectAllowed = 'move';
        }
    };

    const steps = [
        { type: 'step', label: 'Send Email', icon: Mail, description: 'Send an email via SMTP or API' },
        { type: 'step', label: 'HTTP Request', icon: Globe, description: 'Make a generic API call' },
        { type: 'step', label: 'Database Query', icon: Database, description: 'Execute a SQL query' },
        { type: 'step', label: 'Run Script', icon: Code, description: 'Execute custom JavaScript' },
        { type: 'step', label: 'Slack Message', icon: MessageSquare, description: 'Post to a Slack channel' },
        { type: 'step', label: 'Stream', icon: MessageSquare, description: 'Stream updates to the UI' },
    ];

    const controlFlow = [
        { type: 'schedule', label: 'Schedule', icon: Clock, description: 'Trigger on a timer' },
        { type: 'step', label: 'Sleep', icon: Clock, description: 'Pause workflow for a duration' },
        { type: 'step', label: 'Wait for Event', icon: PauseCircle, description: 'Pause until an event occurs' },
        { type: 'approval', label: 'Approval', icon: UserCheck, description: 'Wait for human review' },
        { type: 'if', label: 'If / Else', icon: Split, description: 'Branch based on condition' },
        { type: 'loop', label: 'Loop', icon: Repeat, description: 'Iterate over a list' },
        { type: 'parallel', label: 'Parallel', icon: GitMerge, description: 'Run branches concurrently' },
        { type: 'subWorkflow', label: 'Sub-Workflow', icon: Workflow, description: 'Run another workflow' },
        { type: 'ai', label: 'AI Generation', icon: Sparkles, description: 'Generate text with AI' },
        { type: 'transform', label: 'Transform', icon: Code, description: 'Map/Filter data' },
    ];

    return (
        <React.Fragment>
            <aside className="h-full w-64 border-r flex flex-col" style={{
                backgroundColor: 'var(--sidebar-background)',
                borderColor: 'var(--border-color)'
            }}>
                <div className="flex-1 overflow-y-auto p-4" style={{
                    scrollbarWidth: 'thin',
                    scrollbarColor: 'var(--foreground-subtitle) transparent'
                }}>
                    <div className="mb-6">
                        <h2 className="text-sm font-bold mb-1" style={{
                            color: 'var(--foreground-title)',
                            letterSpacing: '-0.05em'
                        }}>
                            WORKFLOW STEPS
                        </h2>
                        <p className="text-xs" style={{
                            color: 'var(--foreground-subtitle)',
                            letterSpacing: '-0.02em',
                            opacity: 0.8
                        }}>Drag steps to the canvas</p>
                    </div>

                    <div className="space-y-2 mb-8">
                        {steps.map((step) => (
                            <div
                                key={step.label}
                                className="flex cursor-grab items-center gap-3 rounded-lg border p-3 transition-all"
                                style={{
                                    backgroundColor: 'var(--node-background)',
                                    borderColor: 'var(--border-color)'
                                }}
                                onDragStart={(event) => onDragStart(event, step.type, step.label)}
                                draggable
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.borderColor = 'var(--foreground-subtitle)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.borderColor = 'var(--border-color)';
                                }}
                            >
                                <div className="flex h-8 w-8 items-center justify-center rounded" style={{
                                    backgroundColor: 'var(--accent-bg)',
                                    color: 'var(--foreground-subtitle)'
                                }}>
                                    <step.icon size={16} />
                                </div>
                                <div>
                                    <div className="text-sm font-medium" style={{
                                        color: 'var(--foreground-body)',
                                        letterSpacing: '-0.02em'
                                    }}>
                                        {step.label}
                                    </div>
                                    <div className="text-[10px]" style={{
                                        color: 'var(--foreground-subtitle)',
                                        letterSpacing: '-0.01em',
                                        opacity: 0.7
                                    }}>
                                        {step.description}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mb-6">
                        <h2 className="text-sm font-bold" style={{
                            color: 'var(--foreground-title)',
                            letterSpacing: '-0.05em'
                        }}>
                            CONTROL FLOW
                        </h2>
                    </div>

                    <div className="space-y-2">
                        {controlFlow.map((step) => (
                            <div
                                key={step.label}
                                className="flex cursor-grab items-center gap-3 rounded-lg border p-3 transition-all"
                                style={{
                                    backgroundColor: 'var(--node-background)',
                                    borderColor: 'var(--border-color)'
                                }}
                                onDragStart={(event) => onDragStart(event, step.type, step.label)}
                                draggable
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.borderColor = 'var(--foreground-subtitle)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.borderColor = 'var(--border-color)';
                                }}
                            >
                                <div className="flex h-8 w-8 items-center justify-center rounded" style={{
                                    backgroundColor: 'var(--accent-bg)',
                                    color: 'var(--foreground-subtitle)'
                                }}>
                                    <step.icon size={16} />
                                </div>
                                <div>
                                    <div className="text-sm font-medium" style={{
                                        color: 'var(--foreground-body)',
                                        letterSpacing: '-0.02em'
                                    }}>
                                        {step.label}
                                    </div>
                                    <div className="text-[10px]" style={{
                                        color: 'var(--foreground-subtitle)',
                                        letterSpacing: '-0.01em',
                                        opacity: 0.7
                                    }}>
                                        {step.description}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* References Button */}
                    <div className="mt-8 relative">
                        <button
                            onClick={() => setShowSecrets(!showSecrets)}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg border transition-all w-full"
                            style={{
                                backgroundColor: 'var(--node-background)',
                                borderColor: 'var(--border-color)',
                                color: 'var(--foreground-subtitle)'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.borderColor = 'var(--foreground-subtitle)';
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.borderColor = 'var(--border-color)';
                            }}
                        >
                            <Info size={14} />
                            <span className="text-xs font-medium" style={{ letterSpacing: '-0.02em' }}>References</span>
                            <ChevronDown
                                size={14}
                                className="ml-auto transition-transform"
                                style={{ transform: showSecrets ? 'rotate(180deg)' : 'rotate(0deg)' }}
                            />
                        </button>

                        {/* Dropdown */}
                        {showSecrets && (
                            <div
                                className="absolute bottom-full left-0 right-0 mb-2 rounded-lg border p-2 space-y-1"
                                style={{
                                    backgroundColor: 'var(--node-background)',
                                    borderColor: 'var(--border-color)',
                                    zIndex: 50
                                }}
                            >
                                <div className="text-[10px] px-2 py-1" style={{
                                    color: 'var(--foreground-subtitle)',
                                    letterSpacing: '-0.01em',
                                    opacity: 0.7
                                }}>
                                    Click to copy reference
                                </div>

                                {secretsLoading ? (
                                    <div className="px-2 py-2 text-center text-[11px]" style={{ color: 'var(--foreground-subtitle)', opacity: 0.6 }}>
                                        Loading secrets...
                                    </div>
                                ) : secretsError ? (
                                    <div className="px-2 py-2 text-center text-[11px]" style={{ color: '#ef4444' }}>
                                        {secretsError}
                                    </div>
                                ) : secrets.length === 0 ? (
                                    <div className="px-2 py-2 text-center text-[11px]" style={{ color: 'var(--foreground-subtitle)', opacity: 0.6 }}>
                                        No secrets configured
                                        <div className="text-[9px] mt-1" style={{ opacity: 0.8 }}>
                                            Add WORKFLOW_SECRET_* to .env.local
                                        </div>
                                    </div>
                                ) : (
                                    secrets.map((secret) => (
                                        <button
                                            key={secret}
                                            onClick={() => {
                                                navigator.clipboard.writeText(`{{${secret}}}`);
                                            }}
                                            className="flex items-center gap-2 w-full rounded px-2 py-1.5 transition-all"
                                            style={{
                                                backgroundColor: 'transparent',
                                            }}
                                            onMouseEnter={(e) => {
                                                e.currentTarget.style.backgroundColor = 'var(--accent-bg)';
                                            }}
                                            onMouseLeave={(e) => {
                                                e.currentTarget.style.backgroundColor = 'transparent';
                                            }}
                                        >
                                            <Lock size={11} style={{ color: 'var(--foreground-subtitle)', opacity: 0.6 }} />
                                            <code className="text-[11px] font-mono" style={{ letterSpacing: '-0.01em' }}>{`{{${secret}}}`}</code>
                                        </button>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </aside>
        </React.Fragment>
    );
};
