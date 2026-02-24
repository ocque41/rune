'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { InspectCallRow, InspectToolRow, InspectJobRow } from '@/lib/inspect/types';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface DrilldownListsProps {
    calls: InspectCallRow[];
    tools: InspectToolRow[];
    jobs: InspectJobRow[];
    loading: boolean;
}

export function DrilldownLists({ calls, tools, jobs, loading }: DrilldownListsProps) {

    const [search, setSearch] = useState('');

    if (loading) {
        return (
            <Card className="glass-card mt-6">
                <CardHeader>
                    <Skeleton className="h-6 w-[200px]" />
                </CardHeader>
                <CardContent className="space-y-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="glass-card mt-6 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg font-medium">Detailed Activity</CardTitle>
                <div className="relative w-64">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search IDs or names..."
                        className="pl-8 h-9 bg-secondary border-none"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="calls" className="w-full">
                    <TabsList className="mb-4 bg-secondary">
                        <TabsTrigger value="calls">LLM Calls</TabsTrigger>
                        <TabsTrigger value="tools">Tool Invocations</TabsTrigger>
                        <TabsTrigger value="jobs">Autonomy Jobs</TabsTrigger>
                    </TabsList>

                    <TabsContent value="calls">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Time</TableHead>
                                    <TableHead>Model</TableHead>
                                    <TableHead>Tokens</TableHead>
                                    <TableHead>Latency</TableHead>
                                    <TableHead className="text-right">Cost</TableHead>
                                    <TableHead className="text-right">Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {calls.filter(c => c.id.includes(search) || c.model.includes(search)).map((c) => (
                                    <TableRow key={c.id} className="group hover:bg-white/5 transition-colors">
                                        <TableCell className="font-mono text-xs text-muted-foreground">
                                            {new Date(c.timestamp).toLocaleTimeString()}
                                        </TableCell>
                                        <TableCell><Badge variant="outline" className="font-normal">{c.model}</Badge></TableCell>
                                        <TableCell className="text-xs">{c.tokens.toLocaleString()}</TableCell>
                                        <TableCell className="text-xs">{c.latency_ms}ms</TableCell>
                                        <TableCell className="text-right font-mono text-xs text-muted-foreground">
                                            ${c.cost_usd.toFixed(5)}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <StatusDot status={c.status} />
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TabsContent>

                    <TabsContent value="tools">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Time</TableHead>
                                    <TableHead>Tool Name</TableHead>
                                    <TableHead>Duration</TableHead>
                                    <TableHead className="text-right">Review</TableHead>
                                    <TableHead className="text-right">Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {tools.filter(t => t.id.includes(search) || t.tool_name.includes(search)).map((t) => (
                                    <TableRow key={t.id} className="hover:bg-white/5 transition-colors">
                                        <TableCell className="font-mono text-xs text-muted-foreground">
                                            {new Date(t.timestamp).toLocaleTimeString()}
                                        </TableCell>
                                        <TableCell className="font-medium text-sm text-foreground">{t.tool_name}</TableCell>
                                        <TableCell className="text-xs text-muted-foreground">{t.duration_ms}ms</TableCell>
                                        <TableCell className="text-right">
                                            {t.approval_required && (
                                                <Badge variant="secondary" className="text-[10px] h-5">Approval</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <StatusDot status={t.status} />
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TabsContent>

                    <TabsContent value="jobs">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Time</TableHead>
                                    <TableHead>Job/Policy</TableHead>
                                    <TableHead>Progress</TableHead>
                                    <TableHead className="text-right">Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {jobs.filter(j => j.id.includes(search) || j.name.includes(search)).map((j) => (
                                    <TableRow key={j.id} className="hover:bg-white/5 transition-colors">
                                        <TableCell className="font-mono text-xs text-muted-foreground">
                                            {new Date(j.timestamp).toLocaleTimeString()}
                                        </TableCell>
                                        <TableCell className="font-medium">{j.name}</TableCell>
                                        <TableCell className="text-xs text-muted-foreground">
                                            {j.steps_completed} / {j.total_steps} steps
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <StatusDot status={j.status} />
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
}

const StatusDot = ({ status }: { status: string }) => {
    let color = 'bg-white/45';
    if (status === 'success' || status === 'completed') color = 'bg-white/85';
    if (status === 'failed') color = 'bg-white/60';
    if (status === 'running' || status === 'pending') color = 'bg-white/75';
    if (status === 'waiting_approval') color = 'bg-white/70';

    return (
        <div className="flex items-center justify-end gap-2">
            <span className={cn("h-2 w-2 rounded-full", color)} />
            <span className="text-xs capitalize text-muted-foreground">{status.replace('_', ' ')}</span>
        </div>
    );
};
