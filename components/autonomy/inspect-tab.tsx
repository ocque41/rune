'use client';

import React, { useEffect, useState, useRef } from 'react';
import anime from 'animejs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { Activity, CreditCard, Zap, Database } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

// Types
interface SummaryStats {
    total_requests: number;
    total_tokens: number;
    total_cost_usd: number;
    total_tool_calls: number;
}

export const InspectTab = () => {
    const [stats, setStats] = useState<SummaryStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [range, setRange] = useState<'24h' | '7d' | '30d'>('30d');

    // Anime refs
    const costRef = useRef<HTMLSpanElement>(null);
    const tokensRef = useRef<HTMLSpanElement>(null);

    useEffect(() => {
        loadData();
    }, [range]);

    const loadData = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/rune/autonomy/inspect/summary?range=${range}`);
            const data = await res.json();
            if (data.stats) {
                // Animate values
                animateValue(stats?.total_cost_usd || 0, data.stats.total_cost_usd, costRef);
                animateValue(stats?.total_tokens || 0, data.stats.total_tokens, tokensRef);

                setStats(data.stats);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const animateValue = (start: number, end: number, ref: React.RefObject<HTMLSpanElement>) => {
        if (!ref.current) return;
        const obj = { value: start };
        anime({
            targets: obj,
            value: end,
            easing: 'easeOutExpo',
            duration: 1500,
            round: 100,
            update: () => {
                if (ref.current) {
                    if (ref === costRef) {
                        ref.current.innerText = `$${obj.value.toFixed(4)}`;
                    } else {
                        ref.current.innerText = Math.round(obj.value).toLocaleString();
                    }
                }
            }
        });
    };

    return (
        <div className="p-6 space-y-6 max-w-7xl mx-auto anime-enter">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold tracking-tight">Inspect</h2>
                <div className="flex bg-muted/50 p-1 rounded-lg">
                    {['24h', '7d', '30d'].map((r) => (
                        <button
                            key={r}
                            onClick={() => setRange(r as any)}
                            className={cn(
                                "px-3 py-1 rounded-md text-sm font-medium transition-all",
                                range === r ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            {r.toUpperCase()}
                        </button>
                    ))}
                </div>
            </div>

            {/* Overview Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Estimated Cost</CardTitle>
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            <span ref={costRef}>$0.0000</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {range} estimate (Gemini)
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Tokens</CardTitle>
                        <Database className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            <span ref={tokensRef}>0</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Input + Output + Cached
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Requests</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {stats?.total_requests.toLocaleString() || 0}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Model interactions
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Tool Calls</CardTitle>
                        <Zap className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {stats?.total_tool_calls.toLocaleString() || 0}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Function executions
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Recent Activity Table */}
            <Card className="col-span-4">
                <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                    <RecentActivityTable />
                </CardContent>
            </Card>
        </div>
    );
};

const RecentActivityTable = () => {
    const [events, setEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/rune/autonomy/inspect/calls?limit=10')
            .then(res => res.json())
            .then(data => {
                setEvents(data.data || []);
                setLoading(false);
            });
    }, []);

    if (loading) return <div className="text-sm text-muted-foreground">Loading recent activity...</div>;

    return (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Model</TableHead>
                    <TableHead>Tokens</TableHead>
                    <TableHead className="text-right">Cost</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {events.map((e) => (
                    <TableRow key={e.id}>
                        <TableCell className="font-medium text-xs">
                            {new Date(e.created_at).toLocaleTimeString()}
                        </TableCell>
                        <TableCell>
                            <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80 uppercase">
                                {e.source}
                            </span>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[150px] truncate" title={e.model}>{e.model}</TableCell>
                        <TableCell>{e.total_tokens?.toLocaleString()}</TableCell>
                        <TableCell className="text-right font-mono text-xs">
                            ${Number(e.estimated_cost_usd).toFixed(5)}
                        </TableCell>
                        <TableCell className="text-right">
                            <span className={cn(
                                "text-xs font-medium",
                                e.status === 'success' ? "text-green-500" : "text-red-500"
                            )}>
                                {e.status}
                            </span>
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
};
