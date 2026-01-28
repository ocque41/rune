'use client';

import React, { useEffect, useState } from 'react';
import { OverviewCards } from '@/components/inspect/overview-cards';
import { DrilldownLists } from '@/components/inspect/drilldown-lists';
import { InspectUsageSummary, InspectCallRow, InspectToolRow, InspectJobRow } from '@/lib/inspect/types';
import { toast } from 'sonner';

export default function InspectPage() {
    const [loading, setLoading] = useState(true);

    // Data States
    const [usage, setUsage] = useState<InspectUsageSummary | null>(null);
    const [activities, setActivities] = useState<{
        calls: InspectCallRow[];
        tools: InspectToolRow[];
        jobs: InspectJobRow[];
    }>({ calls: [], tools: [], jobs: [] });

    useEffect(() => {
        async function fetchData() {
            try {
                setLoading(true);

                // 1. Fetch Usage Summary
                const usageRes = await fetch('/api/rune/inspect/usage');
                if (!usageRes.ok) throw new Error('Failed to fetch usage');
                const usageData = await usageRes.json();
                setUsage(usageData);

                // 2. Fetch Activity Feed
                const activityRes = await fetch('/api/rune/inspect/activity?limit=50');
                if (!activityRes.ok) throw new Error('Failed to fetch activity');
                const activityData = await activityRes.json();

                // Process Activity Data into separate lists for the UI tabs
                const calls: InspectCallRow[] = [];
                const tools: InspectToolRow[] = [];
                // Jobs are placeholder for now

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
                    // Future: Handle tool_invocations if the API returns them in the feed
                });

                setActivities({ calls, tools, jobs: [] });

            } catch (error) {
                console.error("Inspect Load Error", error);
                toast.error("Error loading data", {
                    description: "Could not fetch usage metrics."
                });
            } finally {
                setLoading(false);
            }
        }

        fetchData();
    }, []);

    return (
        <div className="container mx-auto p-6 space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col space-y-2">
                <h1 className="text-3xl font-bold tracking-tight text-white/90">Inspect</h1>
                <p className="text-muted-foreground">
                    Monitor your agent's autonomy usage, costs, and execution traces.
                </p>
            </div>

            <OverviewCards data={usage} loading={loading} />

            <DrilldownLists
                calls={activities.calls}
                tools={activities.tools}
                jobs={activities.jobs}
                loading={loading}
            />
        </div>
    );
}
