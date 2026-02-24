'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { Play, CheckCircle, XCircle, Clock, RefreshCw, ChevronDown } from 'lucide-react';
import { WorkflowRun } from '@/lib/run-store';

interface RunListProps {
    onSelectRun: (runId: string) => void;
    selectedRunId?: string;
}

const PAGE_SIZE = 20;

export const RunList = ({ onSelectRun, selectedRunId }: RunListProps) => {
    const [runs, setRuns] = useState<WorkflowRun[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [offset, setOffset] = useState(0);
    const [error, setError] = useState<string | null>(null);

    const fetchRuns = useCallback(async (loadMore = false) => {
        try {
            if (loadMore) {
                setLoadingMore(true);
            } else {
                setLoading(true);
                setOffset(0);
                setHasMore(true);
            }

            const currentOffset = loadMore ? offset : 0;
            const response = await fetch(`/api/runs?limit=${PAGE_SIZE}&offset=${currentOffset}`);
            const data = await response.json();

            if (data.success) {
                if (loadMore) {
                    setRuns(prev => [...prev, ...data.runs]);
                } else {
                    setRuns(data.runs);
                }
                setHasMore(data.runs.length === PAGE_SIZE);
                setOffset(currentOffset + data.runs.length);
                setError(null);
            } else {
                setError(data.error || 'Failed to load runs');
            }
        } catch (err) {
            setError('Failed to connect to API');
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, [offset]);

    useEffect(() => {
        fetchRuns();
        // Poll every 5 seconds only if visible
        const interval = setInterval(() => {
            if (!document.hidden) {
                fetchRuns();
            }
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'completed': return <CheckCircle size={14} className="text-white/85" />;
            case 'failed': return <XCircle size={14} className="text-white/65" />;
            case 'running': return <RefreshCw size={14} className="text-white/80 animate-spin" />;
            default: return <Clock size={14} className="text-white/50" />;
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
                    onClick={() => fetchRuns()}
                    className="rounded border border-white/12 bg-[color:var(--metric-surface-2)] p-1 transition-colors hover:border-white/24 hover:bg-[color:var(--metric-surface-3)]"
                    title="Refresh run history"
                >
                    <RefreshCw size={14} style={{ color: 'var(--foreground-subtitle)' }} />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto">
                {loading && runs.length === 0 ? (
                    <div className="p-4 text-center text-xs opacity-60">Loading...</div>
                ) : error ? (
                    <div className="p-4 text-center text-xs text-white/70">{error}</div>
                ) : runs.length === 0 ? (
                    <div className="p-4 text-center text-xs opacity-60">No runs yet</div>
                ) : (
                    <>
                        <div className="divide-y" style={{ borderColor: 'var(--border-color)' }}>
                            {runs.map((run) => (
                                <button
                                    key={run.id}
                                    onClick={() => onSelectRun(run.id)}
                                    className={`w-full p-3 text-left transition-colors hover:bg-[color:var(--metric-surface-2)] ${selectedRunId === run.id ? 'bg-[color:var(--metric-surface-2)]' : ''
                                        }`}
                                    title={`Open run ${run.id}`}
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

                        {/* Load More Button */}
                        {hasMore && (
                            <div className="p-3 border-t" style={{ borderColor: 'var(--border-color)' }}>
                                <button
                                    onClick={() => fetchRuns(true)}
                                    disabled={loadingMore}
                                    className="w-full flex items-center justify-center gap-2 rounded border border-white/12 bg-[color:var(--metric-surface-2)] py-2 text-xs transition-colors hover:border-white/24 hover:bg-[color:var(--metric-surface-3)]"
                                    style={{ color: 'var(--foreground-subtitle)' }}
                                    title="Load additional runs"
                                >
                                    {loadingMore ? (
                                        <RefreshCw size={12} className="animate-spin" />
                                    ) : (
                                        <ChevronDown size={12} />
                                    )}
                                    <span>{loadingMore ? 'Loading...' : 'Load More'}</span>
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};
