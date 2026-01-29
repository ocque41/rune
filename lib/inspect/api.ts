import { useState, useEffect } from 'react';
import {
    InspectUsageSummary,
    InspectUsageBreakdownRow,
    InspectCallRow,
    InspectToolRow,
    InspectJobRow,
    PeriodRange
} from './types';

// MOCK DATA GENERATORS

const MOCK_MODELS = ['gemini-1.5-pro', 'gemini-1.5-flash', 'gpt-4o', 'claude-3-5-sonnet'];
const MOCK_TOOLS = ['run_workflow', 'search_knowledge', 'send_email', 'approve_request'];

export function useInspectSummary(range: PeriodRange) {
    const [data, setData] = useState<InspectUsageSummary | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        // Simulate network delay
        const timer = setTimeout(() => {
            setData({
                total_tokens: Math.floor(Math.random() * 1000000) + 50000,
                prompt_tokens: Math.floor(Math.random() * 600000),
                completion_tokens: Math.floor(Math.random() * 400000),
                total_cost_usd: Math.random() * 50 + 5,
                total_calls: Math.floor(Math.random() * 500) + 50,
                total_tool_calls: Math.floor(Math.random() * 1200) + 100,
                total_jobs: Math.floor(Math.random() * 50) + 10
            });
            setLoading(false);
        }, 800);
        return () => clearTimeout(timer);
    }, [range]);

    return { data, loading };
}

export function useInspectBreakdown(range: PeriodRange) {
    const [models, setModels] = useState<InspectUsageBreakdownRow[]>([]);
    const [tools, setTools] = useState<InspectUsageBreakdownRow[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        setTimeout(() => {
            setModels(MOCK_MODELS.map((name, i) => ({
                id: `m-${i}`,
                name,
                count: Math.floor(Math.random() * 1000),
                cost_usd: Math.random() * 20,
                percentage: Math.random() * 100
            })).sort((a, b) => b.cost_usd - a.cost_usd));

            setTools(MOCK_TOOLS.map((name, i) => ({
                id: `t-${i}`,
                name,
                count: Math.floor(Math.random() * 2000),
                cost_usd: Math.random() * 5,
                percentage: Math.random() * 100
            })).sort((a, b) => b.count - a.count));

            setLoading(false);
        }, 600);
    }, [range]);

    return { models, tools, loading };
}

export function useInspectCalls(range: PeriodRange) {
    const [calls, setCalls] = useState<InspectCallRow[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        setTimeout(() => {
            setCalls(Array.from({ length: 15 }).map((_, i) => ({
                id: `c-${i}`,
                timestamp: new Date(Date.now() - i * 1000 * 60 * 15).toISOString(),
                model: MOCK_MODELS[Math.floor(Math.random() * MOCK_MODELS.length)],
                latency_ms: Math.floor(Math.random() * 2000) + 200,
                tokens: Math.floor(Math.random() * 2000) + 100,
                cost_usd: Math.random() * 0.05,
                status: Math.random() > 0.1 ? 'success' : 'failed'
            })));
            setLoading(false);
        }, 500);
    }, [range]);

    return { calls, loading };
}

export function useInspectTools(range: PeriodRange) {
    const [tools, setTools] = useState<InspectToolRow[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        setTimeout(() => {
            setTools(Array.from({ length: 15 }).map((_, i) => ({
                id: `tr-${i}`,
                timestamp: new Date(Date.now() - i * 1000 * 60 * 30).toISOString(),
                tool_name: MOCK_TOOLS[Math.floor(Math.random() * MOCK_TOOLS.length)],
                duration_ms: Math.floor(Math.random() * 5000) + 100,
                status: Math.random() > 0.1 ? 'success' : 'pending',
                approval_required: Math.random() > 0.8
            })));
            setLoading(false);
        }, 500);
    }, [range]);

    return { tools, loading };
}

export function useInspectJobs(range: PeriodRange) {
    const [jobs, setJobs] = useState<InspectJobRow[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        setTimeout(() => {
            setJobs(Array.from({ length: 10 }).map((_, i) => ({
                id: `j-${i}`,
                timestamp: new Date(Date.now() - i * 1000 * 60 * 120).toISOString(),
                name: `Autonomy Job #${1000 + i}`,
                steps_completed: Math.floor(Math.random() * 5),
                total_steps: 5,
                status: Math.random() > 0.2 ? 'completed' : 'running'
            })));
            setLoading(false);
        }, 500);
    }, [range]);

    return { jobs, loading };
}
