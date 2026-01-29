'use client';

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { PeriodRange, InspectUsageSummary, InspectCallRow, InspectToolRow, InspectJobRow } from '@/lib/inspect/types';
import { OverviewCards } from '@/components/inspect/overview-cards';
// import { BreakdownTables } from '@/components/inspect/breakdown-tables'; // Temporarily disabled or need to fetch
import { DrilldownLists } from '@/components/inspect/drilldown-lists';
import { toast } from 'sonner';

export const InspectTab = () => {
    const [range, setRange] = useState<PeriodRange>('30d');
    const [loading, setLoading] = useState(true);

    const [summary, setSummary] = useState<InspectUsageSummary | null>(null);
    const [activities, setActivities] = useState<{
        calls: InspectCallRow[];
        tools: InspectToolRow[];
        jobs: InspectJobRow[];
    }>({ calls: [], tools: [], jobs: [] });

    useEffect(() => {
        let mounted = true;

        async function fetchData() {
            try {
                setLoading(true);
                // 1. Fetch data
                const [usageRes, activityRes] = await Promise.all([
                    fetch(`/api/rune/inspect/usage?range=${range}`),
                    fetch(`/api/rune/inspect/activity?limit=50&range=${range}`)
                ]);

                if (!usageRes.ok || !activityRes.ok) throw new Error('Failed to fetch data');

                const usageData = await usageRes.json();
                const activityData = await activityRes.json();

                if (!mounted) return;

                setSummary(usageData);

                // Transform activity data if needed, or assume API matches
                const calls: InspectCallRow[] = [];
                if (activityData.items) {
                    activityData.items.forEach((item: any) => {
                        if (item.type === 'llm_call') {
                            calls.push({
                                id: item.id,
                                timestamp: item.timestamp,
                                model: item.details.model,
                                latency_ms: item.details.latency,
                                tokens: item.details.tokens,
                                cost_usd: item.details.cost,
                                status: item.details.status
                            });
                        }
                    });
                }

                setActivities({ calls, tools: [], jobs: [] });

            } catch (error) {
                console.error("Inspect fetch error", error);
                toast.error("Could not load inspect data");
            } finally {
                if (mounted) setLoading(false);
            }
        }

        fetchData();
        return () => { mounted = false; };
    }, [range]);

    return (
        <div className="p-6 space-y-6 max-w-7xl mx-auto min-h-screen pb-20">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight font-mono">Inspect</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                        Monitor usage, costs, and autonomy execution.
                    </p>
                </div>
                <div className="flex bg-muted/50 p-1 rounded-lg">
                    {(['24h', '7d', '30d'] as PeriodRange[]).map((r) => (
                        <button
                            key={r}
                            onClick={() => setRange(r)}
                            className={cn(
                                "px-3 py-1 rounded-md text-xs font-bold transition-all uppercase tracking-wider",
                                range === r
                                    ? "bg-background shadow-sm text-foreground scale-105"
                                    : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                            )}
                        >
                            {r}
                        </button>
                    ))}
                </div>
            </div>

            <OverviewCards
                data={summary}
                loading={loading}
            />

            {/* Breakdown Tables temporarily hidden until new API endpoint handles them or we derive from activity */}
            {/* 
            <BreakdownTables
                models={[]}
                tools={[]}
                loading={loading}
            /> 
            */}

            <DrilldownLists
                calls={activities.calls}
                tools={activities.tools}
                jobs={activities.jobs}
                loading={loading}
            />
        </div>
    );
};
