'use client';

import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Bot, Clock, AlertTriangle, CheckCircle, XCircle, Search, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

export const JobList = ({
    jobs,
    selectedJobId,
    onSelect,
    onRefresh
}: {
    jobs: any[],
    selectedJobId?: string,
    onSelect: (id: string) => void,
    onRefresh: () => void
}) => {
    return (
        <div className="flex flex-col h-full bg-[#131313] border-r border-white/10">
            {/* Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2 text-white font-semibold">
                    <Bot size={18} className="text-[var(--neon-green)]" />
                    <span>Agent Jobs</span>
                </div>
                <button
                    onClick={onRefresh}
                    className="p-1.5 text-white/40 hover:text-white hover:bg-white/10 rounded-md transition-all"
                >
                    <RefreshCw size={14} />
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
                {jobs.map((job) => (
                    <div
                        key={job.id}
                        onClick={() => onSelect(job.id)}
                        className={cn(
                            "group p-3 rounded-lg cursor-pointer transition-all border border-transparent",
                            selectedJobId === job.id
                                ? "bg-white/10 border-white/10"
                                : "hover:bg-white/5 hover:border-white/5"
                        )}
                    >
                        <div className="flex items-start justify-between mb-1">
                            <h3 className={cn(
                                "text-sm font-medium truncate pr-2",
                                selectedJobId === job.id ? "text-white" : "text-white/70 group-hover:text-white"
                            )}>
                                {job.title || 'Untitled Job'}
                            </h3>
                            <StatusIcon status={job.status} />
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-white/40">
                            <div className="flex items-center gap-1">
                                <Clock size={10} />
                                <span>{formatDistanceToNow(new Date(job.created_at))} ago</span>
                            </div>
                            {job.priority === 'high' && (
                                <span className="text-red-400 font-medium px-1 bg-red-500/10 rounded">HIGH</span>
                            )}
                        </div>
                    </div>
                ))}

                {jobs.length === 0 && (
                    <div className="p-8 text-center text-white/20 text-xs">
                        No jobs found
                    </div>
                )}
            </div>
        </div>
    );
};

const StatusIcon = ({ status }: { status: string }) => {
    switch (status) {
        case 'pending': return <Clock size={14} className="text-blue-400" />;
        case 'running': return <div className="w-3.5 h-3.5 rounded-full border-2 border-[var(--neon-green)] border-t-transparent animate-spin" />;
        case 'completed': return <CheckCircle size={14} className="text-green-500" />;
        case 'failed': return <XCircle size={14} className="text-red-500" />;
        case 'waiting_approval': return <AlertTriangle size={14} className="text-yellow-500 animate-pulse" />;
        default: return <div className="w-3 h-3 rounded-full bg-white/20" />;
    }
};
