'use client';

import React, { useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CreditCard, Database, Activity, Zap } from 'lucide-react';
import anime from 'animejs';
import { InspectUsageSummary } from '@/lib/inspect/types';
import { Skeleton } from '@/components/ui/skeleton';

interface OverviewCardsProps {
    data: InspectUsageSummary | null;
    loading: boolean;
}

export function OverviewCards({ data, loading }: OverviewCardsProps) {
    const costRef = useRef<HTMLSpanElement>(null);
    const tokensRef = useRef<HTMLSpanElement>(null);
    const requestsRef = useRef<HTMLSpanElement>(null);
    const toolsRef = useRef<HTMLSpanElement>(null);

    // Animation Effect
    useEffect(() => {
        if (!loading && data) {
            animateValue(costRef, data.total_cost_usd, true);
            animateValue(tokensRef, data.total_tokens);
            animateValue(requestsRef, data.total_calls);
            animateValue(toolsRef, data.total_tool_calls);
        }
    }, [data, loading]);

    const animateValue = (ref: React.RefObject<HTMLSpanElement | null>, value: number, isCurrency = false) => {
        if (!ref.current) return;

        anime({
            targets: { val: 0 },
            val: value,
            easing: 'easeOutExpo',
            duration: 1200,
            round: isCurrency ? 10000 : 1, // High precision for currency
            update: function (anim) {
                if (ref.current) {
                    const current = parseFloat(anim.animations[0].currentValue);
                    ref.current.innerText = isCurrency
                        ? `$${current.toFixed(4)}`
                        : Math.round(current).toLocaleString();
                }
            }
        });
    };

    if (loading) {
        return (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <Card key={i} className="glass-card">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <Skeleton className="h-4 w-[100px]" />
                            <Skeleton className="h-4 w-4 rounded-full" />
                        </CardHeader>
                        <CardContent>
                            <Skeleton className="h-8 w-[120px] mb-2" />
                            <Skeleton className="h-3 w-[80px]" />
                        </CardContent>
                    </Card>
                ))}
            </div>
        );
    }

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 stagger-enter">
            <Card className="glass-card hover:bg-white/5 transition-colors duration-300">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Estimated Cost</CardTitle>
                    <CreditCard className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold font-mono text-primary">
                        <span ref={costRef}>$0.0000</span>
                    </div>
                    <p className="text-xs text-muted-foreground">USD (Gemini)</p>
                </CardContent>
            </Card>

            <Card className="glass-card hover:bg-white/5 transition-colors duration-300">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Tokens</CardTitle>
                    <Database className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold font-mono text-primary">
                        <span ref={tokensRef}>0</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Prompt + Completion</p>
                </CardContent>
            </Card>

            <Card className="glass-card hover:bg-white/5 transition-colors duration-300">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Model Calls</CardTitle>
                    <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold font-mono text-primary">
                        <span ref={requestsRef}>0</span>
                    </div>
                    <p className="text-xs text-muted-foreground">LLM Invocations</p>
                </CardContent>
            </Card>

            <Card className="glass-card hover:bg-white/5 transition-colors duration-300">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Tool Usage</CardTitle>
                    <Zap className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold font-mono text-primary">
                        <span ref={toolsRef}>0</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Function Calls</p>
                </CardContent>
            </Card>
        </div>
    );
}
