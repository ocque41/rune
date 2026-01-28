'use client';

import React, { useState, useEffect } from 'react';
import { JobList } from './job-list';
import { JobDetails } from './job-details';
import { JobListSkeleton } from './job-list-skeleton';
import { JobDetailsSkeleton } from './job-details-skeleton';
import { PolicySettings } from './policy-settings';
import { InspectTab } from './inspect-tab';
import { getAutonomyJobs, getAutonomyJob } from '@/app/actions/autonomy';
import { toast } from 'sonner';
import { Settings, LayoutGrid, Activity } from 'lucide-react'; // Added Activity icon
import { cn } from '@/lib/utils';

export const AutonomyDashboard = () => {
    const [view, setView] = useState<'jobs' | 'settings' | 'inspect'>('jobs');
    const [selectedJobId, setSelectedJobId] = useState<string | undefined>();
    const [jobs, setJobs] = useState<any[]>([]);
    const [selectedJob, setSelectedJob] = useState<any>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);

    // Initial load & Polling
    useEffect(() => {
        loadJobs();

        const interval = setInterval(() => {
            loadJobs(true);
        }, 5000);

        return () => clearInterval(interval);
    }, []);

    // Load full details when job selected
    useEffect(() => {
        if (selectedJobId) {
            loadJobDetails(selectedJobId);
        } else {
            setSelectedJob(null);
        }
    }, [selectedJobId]);

    const loadJobs = async (silent = false) => {
        if (!silent) setRefreshing(true);
        try {
            const data = await getAutonomyJobs(50);
            setJobs(data || []);

            // If we have a selected job, refresh its details too if visible
            if (selectedJobId && silent) {
                // Optional: refresh details silently to update timeline status
                loadJobDetails(selectedJobId, true);
            }
        } catch (e) {
            if (!silent) toast.error('Failed to load jobs');
        } finally {
            if (!silent) setRefreshing(false);
            setInitialLoading(false);
        }
    };

    const loadJobDetails = async (id: string, silent = false) => {
        try {
            const data = await getAutonomyJob(id);
            setSelectedJob(data);
        } catch (e) {
            if (!silent) toast.error('Failed to load job details');
        }
    };

    return (
        <div className="flex h-full w-full bg-background text-foreground">
            {/* Sidebar Navigation */}
            <div className="w-[60px] border-r border-border flex flex-col items-center py-4 gap-4 bg-card">
                <NavButton
                    active={view === 'jobs'}
                    onClick={() => setView('jobs')}
                    icon={LayoutGrid}
                    label="Jobs"
                />
                <NavButton
                    active={view === 'inspect'}
                    onClick={() => setView('inspect')}
                    icon={Activity}
                    label="Inspect"
                />
                <NavButton
                    active={view === 'settings'}
                    onClick={() => setView('settings')}
                    icon={Settings}
                    label="Settings"
                />
            </div>

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden">
                {view === 'jobs' && (
                    <>
                        <div className="w-80 h-full border-r border-border">
                            {initialLoading ? (
                                <JobListSkeleton />
                            ) : (
                                <JobList
                                    jobs={jobs}
                                    selectedJobId={selectedJobId}
                                    onSelect={setSelectedJobId}
                                    onRefresh={() => loadJobs(false)}
                                />
                            )}
                        </div>
                        <div className="flex-1 h-full bg-background">
                            {initialLoading ? <JobDetailsSkeleton /> : <JobDetails job={selectedJob} />}
                        </div>
                    </>
                )}

                {view === 'inspect' && (
                    <div className="flex-1 h-full overflow-y-auto bg-background">
                        <InspectTab />
                    </div>
                )}

                {view === 'settings' && (
                    <div className="flex-1 h-full overflow-y-auto bg-background">
                        <PolicySettings />
                    </div>
                )}
            </div>
        </div>
    );
};

const NavButton = ({ active, onClick, icon: Icon, label }: any) => (
    <button
        onClick={onClick}
        className={cn(
            "p-3 rounded-xl transition-all group relative",
            active
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
        )}
        title={label}
    >
        <Icon size={20} />
        {active && (
            <div className="absolute left-[-2px] top-3 bottom-3 w-[2px] bg-primary rounded-r-full" />
        )}
    </button>
);
