'use client';

import React, { useState } from 'react';
import { approveJob, rejectJob } from '@/app/actions/autonomy';
import { toast } from 'sonner';
import { useEnterAnimation } from '@/hooks/use-enter-animation';
import { CheckCircle, XCircle, Clock, Play, Terminal, Cpu, UserCheck, ShieldAlert } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

export const JobDetails = ({ job }: { job: any }) => {
    const scope = useEnterAnimation({ selector: '.step-item', stagger: 50, delay: 100 });
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
    const completedSteps = planSteps.filter((step: any) => step.status === 'completed').length;
    const failedSteps = planSteps.filter((step: any) => step.status === 'failed').length;
    const runningSteps = planSteps.filter((step: any) => step.status === 'running').length;
    const progressValue = planSteps.length ? Math.round((completedSteps / planSteps.length) * 100) : 0;

    return (
        <div className="h-full flex flex-col bg-background animate-in fade-in duration-300">
            {/* Header */}
            <div className="border-b border-border p-6 flex items-start justify-between bg-card/50 backdrop-blur-sm">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <StatusBadge status={job.status} />
                        <span className="text-xs text-muted-foreground font-mono uppercase tracking-wider">{job.id.slice(0, 8)}</span>
                    </div>
                    <h1 className="text-2xl font-bold text-foreground mb-1">{job.title || 'Untitled Job'}</h1>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground/80">
                        <Clock size={14} />
                        <span>Created {formatDistanceToNow(new Date(job.created_at))} ago</span>
                    </div>
                </div>

                {job.status === 'waiting_approval' && (
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleReject}
                            disabled={actionLoading}
                            className="px-4 py-2 bg-destructive/10 text-destructive border border-destructive/20 rounded-md hover:bg-destructive/20 transition-all font-medium text-sm flex items-center gap-2"
                        >
                            <ShieldAlert size={16} />
                            Reject
                        </button>
                        <button
                            onClick={handleApprove}
                            disabled={actionLoading}
                            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:opacity-90 transition-all font-medium text-sm flex items-center gap-2"
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
                <div className="bg-muted/30 border border-border rounded-lg p-4">
                    <div className="flex items-center gap-2 text-foreground/80 mb-2 font-medium">
                        <Cpu size={16} className="text-primary" />
                        AI Reasoning
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                        {job.context?.triage_reason || job.triage_result?.reason || "No reasoning context provided."}
                    </p>
                </div>

                {/* Progress */}
                <div className="bg-card/60 border border-border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-sm font-semibold text-foreground">Execution Progress</h3>
                            <p className="text-xs text-muted-foreground">{completedSteps}/{planSteps.length} steps complete</p>
                        </div>
                        <div className="flex items-center gap-2">
                            {runningSteps > 0 && (
                                <Badge className="bg-primary/15 text-primary border-primary/30">Running</Badge>
                            )}
                            {failedSteps > 0 && (
                                <Badge className="bg-destructive/10 text-destructive border-destructive/30">{failedSteps} Failed</Badge>
                            )}
                        </div>
                    </div>
                    <Progress
                        value={progressValue}
                        className="h-2 bg-muted"
                        indicatorClassName={failedSteps > 0 ? "bg-destructive" : "bg-primary"}
                    />
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>{progressValue}% complete</span>
                        <span>{planSteps.length === 0 ? 'No plan available' : 'Tracking step execution'}</span>
                    </div>
                </div>

                {/* Execution Plan */}
                <div>
                    <h3 className="text-sm font-medium text-muted-foreground/60 uppercase tracking-wider mb-4 pl-1">Execution Plan</h3>

                    <div ref={scope} className="space-y-4">
                        {planSteps.length === 0 && (
                            <div className="p-4 border border-dashed border-border rounded-lg text-muted-foreground text-center text-sm">
                                No steps generated
                            </div>
                        )}

                        {planSteps.map((step: any, index: number) => (
                            <div key={index} className="step-item opacity-0 relative pl-8 group">
                                {/* Timeline Line */}
                                {index !== planSteps.length - 1 && (
                                    <div className="absolute left-[11px] top-7 bottom-[-20px] w-px bg-border group-hover:bg-foreground/20 transition-colors" />
                                )}

                                {/* Status Icon */}
                                <div className={`absolute left-0 top-1 w-6 h-6 rounded-full border flex items-center justify-center bg-background z-10 
                                    ${getStatusColor(step.status)}`}>
                                    {getStepIcon(step.status)}
                                </div>

                                <div className="bg-card border border-border rounded-md p-3 hover:border-foreground/20 transition-colors">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="font-mono text-xs text-primary/80 font-medium">{step.tool}</span>
                                        {step.status === 'completed' && step.executed_at && (
                                            <span className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(step.executed_at))} ago</span>
                                        )}
                                    </div>
                                    <p className="text-sm text-foreground/80 mb-2">{step.reason || "Execute tool"}</p>

                                    {/* Arguments */}
                                    <div className="bg-background/50 rounded p-2 font-mono text-[10px] text-muted-foreground overflow-x-auto whitespace-pre-wrap border border-border/50">
                                        {JSON.stringify(step.args, null, 2)}
                                    </div>

                                    {/* Result */}
                                    {step.result && (
                                        <div className="mt-2 pt-2 border-t border-border/50">
                                            <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-1">
                                                <Terminal size={10} />
                                                Output
                                            </div>
                                            <div className="bg-background/50 rounded p-2 font-mono text-[10px] text-primary/70 overflow-x-auto whitespace-pre-wrap border border-border/50">
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
        pending: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
        running: 'bg-primary/10 text-primary border-primary/20 animate-pulse',
        completed: 'bg-green-500/10 text-green-400 border-green-500/20',
        failed: 'bg-red-500/10 text-red-400 border-red-500/20',
        waiting_approval: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
        cancelled: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
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
        case 'running': return 'border-primary/50 text-primary';
        default: return 'border-border text-muted-foreground';
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
