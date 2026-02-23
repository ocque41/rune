
import React, { useState } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface ToolCall {
    name: string;
    arguments: any;
}

type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'auto_approved';

interface ApprovalCardProps {
    messageId: string;
    toolCalls: ToolCall[];
    status?: ApprovalStatus;
    onAction?: (status: 'approved' | 'rejected', resumeSessionId?: string | null) => void;
}

export function ApprovalCard({ messageId, toolCalls, status = 'pending', onAction }: ApprovalCardProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [currentStatus, setCurrentStatus] = useState<ApprovalStatus>(status);

    const handleAction = async (decision: 'approved' | 'rejected') => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/agent/approve', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messageId, decision })
            });

            if (!res.ok) throw new Error('Failed to update status');

            const data = await res.json();
            setCurrentStatus(decision);
            if (onAction) onAction(decision, data.resume?.sessionId || null);

            if (decision === 'approved') {
                toast.success('Approved! Resuming agent...');
            } else {
                toast.info('Request rejected.');
            }
        } catch (e) {
            toast.error('Failed to submit decision');
        } finally {
            setIsLoading(false);
        }
    };

    if (currentStatus !== 'pending') {
        const isApproved = currentStatus === 'approved' || currentStatus === 'auto_approved';
        const statusLabel = currentStatus === 'auto_approved' ? 'auto-approved' : currentStatus;
        return (
            <div className={cn("flex items-center gap-2 p-2 text-sm rounded-md border",
                isApproved ? "bg-green-50/50 border-green-200 text-green-700" : "bg-red-50/50 border-red-200 text-red-700"
            )}>
                {isApproved ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                <span>Tool execution {statusLabel}.</span>
            </div>
        );
    }

    return (
        <Card className="w-full max-w-md border-border bg-card my-2 animate-in fade-in zoom-in-95 duration-200">
            <CardHeader className="pb-2 border-b border-border mb-2">
                <CardTitle className="text-sm font-medium flex items-center justify-between text-foreground">
                    <span className="flex items-center gap-2">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-500"></span>
                        </span>
                        Approval Required
                    </span>
                    <Badge variant="outline" className="text-yellow-500 border-yellow-500/30 bg-yellow-500/10 font-mono text-xs uppercase tracking-wider">
                        HitL Paused
                    </Badge>
                </CardTitle>
            </CardHeader>
            <CardContent className="pb-2 text-sm text-foreground/80 space-y-3">
                <p className="text-muted-foreground text-xs uppercase tracking-wider font-medium">Proposed Tool Execution</p>
                <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                    {toolCalls.map((call, i) => (
                        <div key={i} className="bg-muted/50 p-2.5 rounded-md border border-border group hover:border-foreground/20 transition-colors">
                            <div className="font-mono text-xs text-primary mb-1">{call.name}</div>
                            <div className="text-[10px] text-muted-foreground font-mono bg-background/50 p-1.5 rounded border border-border overflow-x-auto whitespace-pre-wrap">
                                {JSON.stringify(call.arguments, null, 2)}
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
            <CardFooter className="flex justify-end gap-2 pt-2 border-t border-border mt-2">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleAction('rejected')}
                    disabled={isLoading}
                    className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                >
                    Reject
                </Button>
                <Button
                    size="sm"
                    onClick={() => handleAction('approved')}
                    disabled={isLoading}
                    className="bg-primary text-primary-foreground hover:opacity-90 transition-opacity font-medium"
                >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <CheckCircle2 className="w-4 h-4 mr-1" />}
                    Approve & Run
                </Button>
            </CardFooter>
        </Card>
    );
}
