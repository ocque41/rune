
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

interface ApprovalCardProps {
    messageId: string;
    toolCalls: ToolCall[];
    status?: 'pending' | 'approved' | 'rejected';
    onAction?: (status: 'approved' | 'rejected') => void;
}

export function ApprovalCard({ messageId, toolCalls, status = 'pending', onAction }: ApprovalCardProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [currentStatus, setCurrentStatus] = useState(status);

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
            if (onAction) onAction(decision);

            if (decision === 'approved' && data.instruction) {
                toast.success('Approved! Resuming agent...');
                // The parent component should handle the actual resumption (re-fetch/stream)
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
        return (
            <div className={cn("flex items-center gap-2 p-2 text-sm rounded-md border",
                currentStatus === 'approved' ? "bg-green-50/50 border-green-200 text-green-700" : "bg-red-50/50 border-red-200 text-red-700"
            )}>
                {currentStatus === 'approved' ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                <span>Tool execution {currentStatus}.</span>
            </div>
        );
    }

    return (
        <Card className="w-full max-w-md border-amber-200 bg-amber-50/30 my-2">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center justify-between text-amber-900">
                    <span>Approval Required</span>
                    <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-100">
                        Paused
                    </Badge>
                </CardTitle>
            </CardHeader>
            <CardContent className="pb-2 text-sm text-slate-600">
                <p className="mb-2">The agent wants to execute the following tools:</p>
                <ul className="space-y-2">
                    {toolCalls.map((call, i) => (
                        <li key={i} className="bg-white p-2 rounded border text-xs font-mono">
                            <div className="font-semibold text-slate-800">{call.name}</div>
                            <div className="text-slate-500 truncate">{JSON.stringify(call.arguments)}</div>
                        </li>
                    ))}
                </ul>
            </CardContent>
            <CardFooter className="flex justify-end gap-2 pt-2">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleAction('rejected')}
                    disabled={isLoading}
                    className="text-slate-500 hover:text-slate-700"
                >
                    Reject
                </Button>
                <Button
                    size="sm"
                    onClick={() => handleAction('approved')}
                    disabled={isLoading}
                    className="bg-amber-600 hover:bg-amber-700 text-white"
                >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                    Approve & Run
                </Button>
            </CardFooter>
        </Card>
    );
}
