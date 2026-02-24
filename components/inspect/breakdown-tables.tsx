'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { InspectUsageBreakdownRow } from '@/lib/inspect/types';
import { Skeleton } from '@/components/ui/skeleton';

interface BreakdownTablesProps {
    models: InspectUsageBreakdownRow[];
    tools: InspectUsageBreakdownRow[];
    loading: boolean;
}

export function BreakdownTables({ models, tools, loading }: BreakdownTablesProps) {
    if (loading) {
        return (
            <div className="grid gap-4 md:grid-cols-2">
                <Card className="glass-card">
                    <CardHeader><Skeleton className="h-6 w-[150px]" /></CardHeader>
                    <CardContent className="space-y-4">
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                    </CardContent>
                </Card>
                <Card className="glass-card">
                    <CardHeader><Skeleton className="h-6 w-[150px]" /></CardHeader>
                    <CardContent className="space-y-4">
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="grid gap-4 md:grid-cols-2 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-100">
            {/* Models Breakdown */}
            <Card className="glass-card">
                <CardHeader>
                    <CardTitle className="text-sm font-medium text-muted-foreground">Usage by Model</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    {models.map((m) => (
                        <div key={m.id} className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                                <span className="font-mono font-medium">{m.name}</span>
                                <span className="text-muted-foreground">${m.cost_usd.toFixed(4)}</span>
                            </div>
                            <Progress value={m.percentage} className="h-1 bg-secondary" indicatorClassName="bg-primary/80" />
                        </div>
                    ))}
                    {models.length === 0 && <div className="text-sm text-muted-foreground">No model usage data.</div>}
                </CardContent>
            </Card>

            {/* Tools Breakdown */}
            <Card className="glass-card">
                <CardHeader>
                    <CardTitle className="text-sm font-medium text-muted-foreground">Usage by Tool</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    {tools.map((t) => (
                        <div key={t.id} className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                                <span className="font-mono font-medium">{t.name}</span>
                                <span className="text-muted-foreground">{t.count.toLocaleString()} calls</span>
                            </div>
                            <Progress value={t.percentage} className="h-1 bg-secondary" indicatorClassName="bg-white/80" />
                        </div>
                    ))}
                    {tools.length === 0 && <div className="text-sm text-muted-foreground">No tool usage data.</div>}
                </CardContent>
            </Card>
        </div>
    );
}
