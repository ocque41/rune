'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { PeriodRange } from '@/lib/inspect/types';
import {
    useInspectSummary,
    useInspectBreakdown,
    useInspectCalls,
    useInspectTools,
    useInspectJobs
} from '@/lib/inspect/api';

import { OverviewCards } from '@/components/inspect/overview-cards';
import { BreakdownTables } from '@/components/inspect/breakdown-tables';
import { DrilldownLists } from '@/components/inspect/drilldown-lists';

export const InspectTab = () => {
    const [range, setRange] = useState<PeriodRange>('30d');

    // Fetch all data in parallel (mocked)
    const summary = useInspectSummary(range);
    const breakdown = useInspectBreakdown(range);
    const calls = useInspectCalls(range);
    const tools = useInspectTools(range);
    const jobs = useInspectJobs(range);

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
                data={summary.data}
                loading={summary.loading}
            />

            <BreakdownTables
                models={breakdown.models}
                tools={breakdown.tools}
                loading={breakdown.loading}
            />

            <DrilldownLists
                calls={calls.calls}
                tools={tools.tools}
                jobs={jobs.jobs}
                loading={calls.loading || tools.loading || jobs.loading}
            />
        </div>
    );
};
