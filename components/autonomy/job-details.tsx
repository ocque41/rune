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
                            className="px-4 py-2 bg-white/10 text-white/80 border border-white/20 rounded-md hover:bg-white/16 transition-all font-medium text-sm flex items-center gap-2"
                            title="Reject this job and stop execution"
                        >
                            <ShieldAlert size={16} />
                            Reject
                        </button>
                        <button
                            onClick={handleApprove}
                            disabled={actionLoading}
                            className="px-4 py-2 bg-white/92 text-black rounded-md hover:bg-white transition-all font-medium text-sm flex items-center gap-2"
                            title="Approve this job and continue execution"
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
                        <Cpu size={16} className="text-white/85" />
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
                                <Badge className="bg-white/15 text-white border-white/30">Running</Badge>
                            )}
                            {failedSteps > 0 && (
                                <Badge className="bg-white/10 text-white/75 border-white/22">{failedSteps} Failed</Badge>
                            )}
                        </div>
                    </div>
                    <Progress
                        value={progressValue}
                        className="h-2 bg-muted"
                        indicatorClassName={failedSteps > 0 ? "bg-white/70" : "bg-white"}
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
        pending: 'bg-white/10 text-white/75 border-white/20',
        running: 'bg-white/15 text-white border-white/30 animate-pulse',
        completed: 'bg-white/14 text-white/90 border-white/28',
        failed: 'bg-white/10 text-white/65 border-white/20',
        waiting_approval: 'bg-white/12 text-white/80 border-white/24',
        cancelled: 'bg-white/8 text-white/55 border-white/16',
    };

    return (
        <span className={`px-2 py-0.5 rounded text-[10px] font-medium border uppercase tracking-wide ${styles[status] || styles.cancelled}`}>
            {status.replace('_', ' ')}
        </span>
    );
};

const getStatusColor = (status: string) => {
    switch (status) {
        case 'completed': return 'border-white/45 text-white/90';
        case 'failed': return 'border-white/30 text-white/65';
        case 'running': return 'border-white/50 text-white';
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
