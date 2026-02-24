'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';

interface Workflow {
    id: string;
    name: string;
    description?: string;
    updated_at?: string;
    type: 'local' | 'cloud';
}

const PAGE_SIZE = 20;

export function WorkflowList({ onSelectWorkflow }: { onSelectWorkflow?: (id: string, type: 'local' | 'cloud') => void }) {
    const [activeTab, setActiveTab] = useState<'local' | 'cloud'>('local');
    const [workflows, setWorkflows] = useState<Workflow[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [offset, setOffset] = useState(0);

    useEffect(() => {
        // Auto-detect storage based on hostname
        const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        setActiveTab(isLocal ? 'local' : 'cloud');
    }, []);

    const fetchWorkflows = useCallback(async (loadMore = false) => {
        if (loadMore) {
            setIsLoadingMore(true);
        } else {
            setIsLoading(true);
            setOffset(0);
            setHasMore(true);
        }

        try {
            const currentOffset = loadMore ? offset : 0;
            const endpoint = activeTab === 'local'
                ? '/api/workflows/list'
                : `/api/rune/workflows?limit=${PAGE_SIZE}&offset=${currentOffset}`;
            const res = await fetch(endpoint);
            const data = await res.json();

            if (!res.ok) throw new Error(data.error || 'Failed to fetch');

            const mapped: Workflow[] = data.workflows.map((w: { id: string; name: string; description?: string; updated_at?: string }) => ({
                id: w.id,
                name: w.name,
                description: w.description,
                updated_at: w.updated_at,
                type: activeTab
            }));

            if (loadMore) {
                setWorkflows(prev => [...prev, ...mapped]);
            } else {
                setWorkflows(mapped);
            }

            // Check if there are more items
            setHasMore(mapped.length === PAGE_SIZE);
            setOffset(currentOffset + mapped.length);
        } catch (error) {
            console.error('Fetch error:', error);
            toast.error('Failed to load workflows');
        } finally {
            setIsLoading(false);
            setIsLoadingMore(false);
        }
    }, [activeTab, offset]);

    const onDeleteWorkflow = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm("Are you sure you want to delete this workflow?")) return;

        try {
            const response = await fetch(`/api/rune/workflows/${id}`, { method: 'DELETE' });
            if (!response.ok) throw new Error('Failed to delete');

            toast.success('Workflow deleted');
            fetchWorkflows();
        } catch (error) {
            console.error('Delete error:', error);
            toast.error('Failed to delete workflow');
        }
    };

    useEffect(() => {
        fetchWorkflows();
    }, [activeTab]);

    return (
        <div className="flex h-full flex-col bg-[color:var(--metric-surface-1)]">
            <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
                <div className="flex gap-2 items-center">
                    <h2 className="text-lg font-bold mr-4" style={{ color: 'var(--foreground-title)' }}>Your Workflows</h2>
                    <span className="rounded border border-white/12 bg-[color:var(--metric-surface-2)] px-2 py-1 text-xs opacity-70" style={{ color: 'var(--foreground-subtitle)' }}>
                        {activeTab === 'local' ? 'Local Storage' : 'Cloud Storage'}
                    </span>
                </div>
                <button
                    onClick={() => fetchWorkflows()}
                    disabled={isLoading}
                    className="rounded-md border border-white/12 bg-[color:var(--metric-surface-2)] p-2 transition-colors opacity-70 hover:border-white/24 hover:opacity-100"
                    title="Refresh workflow list"
                >
                    <span className="text-xs" style={{ color: 'var(--foreground-title)' }}>{isLoading ? 'Loading' : 'Refresh'}</span>
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
                {isLoading ? (
                    <div className="flex items-center justify-center h-full opacity-50">Loading...</div>
                ) : workflows.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full opacity-50 gap-2">
                        <span className="text-sm">No workflows found. Save a workflow in the Editor to see it here.</span>
                    </div>
                ) : (
                    <>
                        <div className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                            {workflows.map((workflow) => (
                                <div
                                    key={workflow.id}
                                    className="group relative flex cursor-pointer flex-col rounded-lg border bg-[color:var(--metric-surface-2)] p-4 transition-all hover:border-white/24"
                                    style={{ borderColor: 'var(--border-color)' }}
                                    onClick={() => onSelectWorkflow?.(workflow.id, workflow.type)}
                                    title={`Open ${workflow.name} in editor`}
                                >
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="rounded border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-white/60">
                                            Workflow
                                        </div>
                                        <span className="font-semibold truncate" style={{ color: 'var(--foreground-title)' }}>
                                            {workflow.name}
                                        </span>
                                    </div>
                                    {activeTab === 'cloud' && (
                                        <button
                                            onClick={(e) => onDeleteWorkflow(workflow.id, e)}
                                            className="absolute right-2 top-2 rounded-md border border-white/20 bg-white/8 px-2 py-1 text-[10px] text-white/70 opacity-0 transition-all group-hover:opacity-100 hover:bg-white/14 hover:text-white"
                                            title="Delete workflow from cloud storage"
                                        >
                                            Delete
                                        </button>
                                    )}
                                    {workflow.description && (
                                        <p className="text-xs opacity-60 line-clamp-2 mb-2" style={{ color: 'var(--foreground-body)' }}>
                                            {workflow.description}
                                        </p>
                                    )}
                                    <div className="mt-auto pt-2 flex items-center justify-between text-[10px] opacity-40" style={{ color: 'var(--foreground-subtitle)' }}>
                                        <span>{workflow.type}</span>
                                        {workflow.updated_at && (
                                            <span>{new Date(workflow.updated_at).toLocaleDateString()}</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Load More Button */}
                        {hasMore && activeTab === 'cloud' && (
                            <div className="flex justify-center mt-6">
                                <button
                                    onClick={() => fetchWorkflows(true)}
                                    disabled={isLoadingMore}
                                    className="flex items-center gap-2 rounded-lg border border-white/14 bg-[color:var(--metric-surface-2)] px-4 py-2 transition-colors hover:border-white/25 hover:bg-[color:var(--metric-surface-3)]"
                                    style={{ borderColor: 'var(--border-color)', color: 'var(--foreground-title)' }}
                                    title="Load additional workflows from storage"
                                >
                                    <span className="text-xs">{isLoadingMore ? 'Loading' : 'More'}</span>
                                    <span className="text-sm">{isLoadingMore ? 'Loading...' : 'Load More'}</span>
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
