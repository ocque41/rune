'use client';

import React, { useState } from 'react';
import { approveJob, rejectJob } from '@/app/actions/autonomy';
import { toast } from 'sonner';
import { CheckCircle, XCircle, Clock, Play, AlertCircle, Terminal, Cpu, UserCheck, ShieldAlert } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export const JobDetails = ({ job }: { job: any }) => {
    const [actionLoading, setActionLoading] = useState(false);

    if (!job) {
        return <div className="flex items-center justify-center h-full text-white/30">Select a job to view details</div>;
    }

    const handleApprove = async () => {
        setActionLoading(true);
        try {
            await approveJob(job.id);
            toast.success('Job approved and queued for execution');
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setActionLoading(false);
        }
    };

    const handleReject = async () => {
        setActionLoading(true);
        try {
            await rejectJob(job.id);
            toast.success('Job rejected');
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setActionLoading(false);
        }
    };

    const planSteps = job.plan?.steps || [];

    return (
        <div className="h-full flex flex-col bg-[#0A0A0A] animate-in fade-in duration-300">
            {/* Header */}
            <div className="border-b border-white/10 p-6 flex items-start justify-between bg-[#111]">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <StatusBadge status={job.status} />
                        <span className="text-xs text-white/40 font-mono uppercase tracking-wider">{job.id.slice(0, 8)}</span>
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-1">{job.title || 'Untitled Job'}</h1>
                    <div className="flex items-center gap-2 text-sm text-white/50">
                        <Clock size={14} />
                        <span>Created {formatDistanceToNow(new Date(job.created_at))} ago</span>
                    </div>
                </div>

                {job.status === 'waiting_approval' && (
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleReject}
                            disabled={actionLoading}
                            className="px-4 py-2 bg-red-500/10 text-red-500 border border-red-500/20 rounded-md hover:bg-red-500/20 transition-all font-medium text-sm flex items-center gap-2"
                        >
                            <ShieldAlert size={16} />
                            Reject
                        </button>
                        <button
                            onClick={handleApprove}
                            disabled={actionLoading}
                            className="px-4 py-2 bg-[var(--neon-green)] text-black rounded-md hover:opacity-90 transition-all font-medium text-sm flex items-center gap-2"
                        >
                            <UserCheck size={16} />
                            Approve & Run
                        </button>
                    </div>
                )}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">

                {/* Triage Reasoning */}
                <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-white/70 mb-2 font-medium">
                        <Cpu size={16} className="text-[var(--neon-green)]" />
                        AI Reasoning
                    </div>
                    <p className="text-sm text-white/60 leading-relaxed">
                        {job.context?.triage_reason || job.triage_result?.reason || "No reasoning context provided."}
                    </p>
                </div>

                {/* Execution Plan */}
                <div>
                    <h3 className="text-sm font-medium text-white/50 uppercase tracking-wider mb-4 pl-1">Execution Plan</h3>

                    <div className="space-y-4">
                        {planSteps.length === 0 && (
                            <div className="p-4 border border-dashed border-white/10 rounded-lg text-white/30 text-center text-sm">
                                No steps generated
                            </div>
                        )}

                        {planSteps.map((step: any, index: number) => (
                            <div key={index} className="relative pl-8 group">
                                {/* Timeline Line */}
                                {index !== planSteps.length - 1 && (
                                    <div className="absolute left-[11px] top-7 bottom-[-20px] w-px bg-white/10 group-hover:bg-white/20 transition-colors" />
                                )}

                                {/* Status Icon */}
                                <div className={`absolute left-0 top-1 w-6 h-6 rounded-full border flex items-center justify-center bg-[#0A0A0A] z-10 
                                    ${getStatusColor(step.status)}`}>
                                    {getStepIcon(step.status)}
                                </div>

                                <div className="bg-[#161616] border border-white/5 rounded-md p-3 hover:border-white/10 transition-colors">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="font-mono text-xs text-[var(--neon-green)]/80 font-medium">{step.tool}</span>
                                        {step.status === 'completed' && step.executed_at && (
                                            <span className="text-[10px] text-white/30">{formatDistanceToNow(new Date(step.executed_at))} ago</span>
                                        )}
                                    </div>
                                    <p className="text-sm text-white/80 mb-2">{step.reason || "Execute tool"}</p>

                                    {/* Arguments */}
                                    <div className="bg-black/50 rounded p-2 font-mono text-[10px] text-zinc-400 overflow-x-auto whitespace-pre-wrap border border-white/5">
                                        {JSON.stringify(step.args, null, 2)}
                                    </div>

                                    {/* Result */}
                                    {step.result && (
                                        <div className="mt-2 pt-2 border-t border-white/5">
                                            <div className="flex items-center gap-1 text-[10px] text-white/40 mb-1">
                                                <Terminal size={10} />
                                                Output
                                            </div>
                                            <div className="bg-black/50 rounded p-2 font-mono text-[10px] text-[var(--neon-green)]/70 overflow-x-auto whitespace-pre-wrap border border-white/5">
                                                {JSON.stringify(step.result, null, 2).slice(0, 500)}
                                                {JSON.stringify(step.result).length > 500 && '...'}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </div>
    );
};

// Helpers

const StatusBadge = ({ status }: { status: string }) => {
    const styles: Record<string, string> = {
        pending: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
        running: 'bg-[var(--neon-green)]/10 text-[var(--neon-green)] border-[var(--neon-green)]/30 animate-pulse',
        completed: 'bg-green-500/20 text-green-400 border-green-500/30',
        failed: 'bg-red-500/20 text-red-400 border-red-500/30',
        waiting_approval: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
        cancelled: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
    };

    return (
        <span className={`px-2 py-0.5 rounded text-[10px] font-medium border uppercase tracking-wide ${styles[status] || styles.cancelled}`}>
            {status.replace('_', ' ')}
        </span>
    );
};

const getStatusColor = (status: string) => {
    switch (status) {
        case 'completed': return 'border-green-500/50 text-green-500';
        case 'failed': return 'border-red-500/50 text-red-500';
        case 'running': return 'border-[var(--neon-green)]/50 text-[var(--neon-green)]';
        default: return 'border-white/20 text-white/30';
    }
}

const getStepIcon = (status: string) => {
    switch (status) {
        case 'completed': return <CheckCircle size={14} />;
        case 'failed': return <XCircle size={14} />;
        case 'running': return <Play size={14} className="animate-pulse" />;
        default: return <Clock size={14} />;
    }
}
