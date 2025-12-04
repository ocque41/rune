'use client';

import React, { useEffect, useState } from 'react';
import { Play, CheckCircle, XCircle, Clock, RefreshCw } from 'lucide-react';
import { WorkflowRun } from '@/lib/run-store';

interface RunListProps {
    onSelectRun: (runId: string) => void;
    selectedRunId?: string;
}

export const RunList = ({ onSelectRun, selectedRunId }: RunListProps) => {
    const [runs, setRuns] = useState<WorkflowRun[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchRuns = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/runs');
            const data = await response.json();

            if (data.success) {
                setRuns(data.runs);
                setError(null);
            } else {
                setError(data.error || 'Failed to load runs');
            }
        } catch (err) {
            setError('Failed to connect to API');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRuns();
        // Poll every 5 seconds
        const interval = setInterval(fetchRuns, 5000);
        return () => clearInterval(interval);
    }, []);

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'completed': return <CheckCircle size={14} className="text-emerald-500" />;
            case 'failed': return <XCircle size={14} className="text-red-500" />;
            case 'running': return <RefreshCw size={14} className="text-blue-500 animate-spin" />;
            default: return <Clock size={14} className="text-gray-400" />;
        }
    };

    const formatTime = (isoString: string) => {
        return new Date(isoString).toLocaleTimeString();
    };

    const formatDuration = (ms?: number) => {
        if (!ms) return '-';
        if (ms < 1000) return `${ms}ms`;
        return `${(ms / 1000).toFixed(2)}s`;
    };

    return (
        <div className="flex flex-col h-full border-r" style={{ borderColor: 'var(--border-color)' }}>
            <div className="p-4 border-b flex justify-between items-center" style={{ borderColor: 'var(--border-color)' }}>
                <h2 className="font-semibold text-sm" style={{ color: 'var(--foreground-title)' }}>Recent Runs</h2>
                <button
                    onClick={fetchRuns}
                    className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                >
                    <RefreshCw size={14} style={{ color: 'var(--foreground-subtitle)' }} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto">
                {loading && runs.length === 0 ? (
                    <div className="p-4 text-center text-xs opacity-60">Loading...</div>
                ) : error ? (
                    <div className="p-4 text-center text-xs text-red-500">{error}</div>
                ) : runs.length === 0 ? (
                    <div className="p-4 text-center text-xs opacity-60">No runs yet</div>
                ) : (
                    <div className="divide-y" style={{ borderColor: 'var(--border-color)' }}>
                        {runs.map((run) => (
                            <button
                                key={run.id}
                                onClick={() => onSelectRun(run.id)}
                                className={`w-full p-3 text-left transition-colors hover:bg-black/5 dark:hover:bg-white/5 ${selectedRunId === run.id ? 'bg-black/5 dark:bg-white/5' : ''
                                    }`}
                            >
                                <div className="flex items-center justify-between mb-1">
                                    <span className="font-medium text-sm truncate" style={{ color: 'var(--foreground-body)' }}>
                                        {run.workflowName || 'Untitled Workflow'}
                                    </span>
                                    {getStatusIcon(run.status)}
                                </div>
                                <div className="flex items-center justify-between text-xs" style={{ color: 'var(--foreground-subtitle)' }}>
                                    <span>{formatTime(run.startTime)}</span>
                                    <span>{formatDuration(run.duration)}</span>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};
