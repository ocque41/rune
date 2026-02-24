'use client';

import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Clock, RefreshCw, Terminal, Calendar } from 'lucide-react';
import { WorkflowRun } from '@/lib/run-store';

interface RunDetailsProps {
    runId: string;
}

export const RunDetails = ({ runId }: RunDetailsProps) => {
    const [run, setRun] = useState<WorkflowRun | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchRun = async () => {
            if (!runId) return;

            try {
                setLoading(true);
                const response = await fetch(`/api/runs/${runId}`);
                const data = await response.json();

                if (data.success) {
                    setRun(data.run);
                    setError(null);
                } else {
                    setError(data.error || 'Failed to load run details');
                }
            } catch (err) {
                setError('Failed to connect to API');
            } finally {
                setLoading(false);
            }
        };

        fetchRun();
        // Poll for updates if running
        const interval = setInterval(() => {
            if (run?.status === 'running') {
                fetchRun();
            }
        }, 2000);

        return () => clearInterval(interval);
    }, [runId, run?.status]);

    if (loading && !run) {
        return <div className="flex items-center justify-center h-full text-xs opacity-60">Loading details...</div>;
    }

    if (error) {
        return <div className="flex items-center justify-center h-full text-xs text-white/70">{error}</div>;
    }

    if (!run) {
        return <div className="flex items-center justify-center h-full text-xs opacity-60">Select a run to view details</div>;
    }

    return (
        <div className="flex flex-col h-full overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b" style={{ borderColor: 'var(--border-color)' }}>
                <div className="flex items-center gap-3 mb-4">
                    <div className={`p-2 rounded-full ${run.status === 'completed' ? 'bg-white/12 text-white' :
                            run.status === 'failed' ? 'bg-white/8 text-white/70' :
                                'bg-white/10 text-white/85'
                        }`}>
                        {run.status === 'completed' ? <CheckCircle size={20} /> :
                            run.status === 'failed' ? <XCircle size={20} /> :
                                <RefreshCw size={20} className="animate-spin" />}
                    </div>
                    <div>
                        <h1 className="text-lg font-semibold" style={{ color: 'var(--foreground-title)' }}>
                            {run.workflowName || 'Untitled Workflow'}
                        </h1>
                        <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--foreground-subtitle)' }}>
                            <span className="font-mono">{run.id}</span>
                            <span>•</span>
                            <span className="capitalize">{run.status}</span>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                    <div className="p-3 rounded border" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--node-background)' }}>
                        <div className="text-xs mb-1 opacity-70">Started</div>
                        <div className="text-sm font-medium">{new Date(run.startTime).toLocaleString()}</div>
                    </div>
                    <div className="p-3 rounded border" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--node-background)' }}>
                        <div className="text-xs mb-1 opacity-70">Duration</div>
                        <div className="text-sm font-medium">{run.duration ? `${(run.duration / 1000).toFixed(2)}s` : '-'}</div>
                    </div>
                    <div className="p-3 rounded border" style={{ borderColor: 'var(--border-color)', backgroundColor: 'var(--node-background)' }}>
                        <div className="text-xs mb-1 opacity-70">Result</div>
                        <div className={`text-sm font-medium ${run.status === 'failed' ? 'text-white/70' : 'text-white/90'}`}>
                            {run.status === 'completed' ? 'Success' : run.status === 'failed' ? 'Error' : 'Running'}
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Logs */}
                <div>
                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--foreground-title)' }}>
                        <Terminal size={14} />
                        Execution Logs
                    </h3>
                    <div className="rounded-lg border p-4 font-mono text-xs space-y-2" style={{
                        borderColor: 'var(--border-color)',
                        backgroundColor: 'var(--node-background)',
                        maxHeight: '300px',
                        overflowY: 'auto'
                    }}>
                        {run.logs && run.logs.length > 0 ? (
                            run.logs.map((log, i) => (
                                <div key={i} className="flex gap-3">
                                    <span className="opacity-40 select-none">{new Date(log.timestamp).toLocaleTimeString()}</span>
                                    <span className={
                                        log.level === 'error' ? 'text-white/70' :
                                            log.level === 'warn' ? 'text-white/75' :
                                                'text-inherit'
                                    }>
                                        {log.message}
                                    </span>
                                </div>
                            ))
                        ) : (
                            <div className="opacity-40 italic">No logs available</div>
                        )}
                    </div>
                </div>

                {/* Input/Output */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--foreground-title)' }}>Input Arguments</h3>
                        <pre className="rounded-lg border p-4 text-xs overflow-auto" style={{
                            borderColor: 'var(--border-color)',
                            backgroundColor: 'var(--node-background)',
                            maxHeight: '200px'
                        }}>
                            {JSON.stringify(run.args, null, 2)}
                        </pre>
                    </div>

                    <div>
                        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--foreground-title)' }}>
                            {run.status === 'failed' ? 'Error Details' : 'Output Result'}
                        </h3>
                        <pre className={`rounded-lg border p-4 text-xs overflow-auto ${run.status === 'failed' ? 'text-white/75 bg-white/6' : ''}`} style={{
                            borderColor: 'var(--border-color)',
                            backgroundColor: run.status === 'failed' ? undefined : 'var(--node-background)',
                            maxHeight: '200px'
                        }}>
                            {run.status === 'failed'
                                ? run.error || 'Unknown error'
                                : JSON.stringify(run.result, null, 2)
                            }
                        </pre>
                    </div>
                </div>
            </div>
        </div>
    );
};
