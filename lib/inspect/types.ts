export interface InspectUsageSummary {
    total_tokens: number;
    prompt_tokens: number;
    completion_tokens: number;
    total_cost_usd: number;
    total_calls: number;
    total_tool_calls: number;
    total_jobs: number;
}

export interface InspectUsageBreakdownRow {
    id: string;
    name: string; // Model name or Tool name
    count: number;
    cost_usd: number;
    percentage: number; // 0-100 for progress bars
}

export interface InspectCallRow {
    id: string;
    timestamp: string;
    model: string;
    latency_ms: number;
    tokens: number;
    cost_usd: number;
    status: 'success' | 'failed';
}

export interface InspectToolRow {
    id: string;
    timestamp: string;
    tool_name: string;
    workflow_id?: string;
    duration_ms: number;
    status: 'success' | 'failed' | 'pending';
    approval_required: boolean;
}

export interface InspectJobRow {
    id: string;
    timestamp: string;
    name: string; // Policy or Workflow name
    steps_completed: number;
    total_steps: number;
    status: 'running' | 'completed' | 'failed' | 'waiting_approval';
}

export type PeriodRange = '24h' | '7d' | '30d' | 'all';
