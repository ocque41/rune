export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            rune_chats: {
                Row: {
                    id: string
                    user_id: string
                    workflow_id: string | null
                    title: string
                    is_temporary: boolean
                    created_at: string
                    updated_at: string
                    last_message_at: string
                    archived_at: string | null
                }
                Insert: {
                    id?: string
                    user_id?: string
                    workflow_id?: string | null
                    title?: string
                    is_temporary?: boolean
                    created_at?: string
                    updated_at?: string
                    last_message_at?: string
                    archived_at?: string | null
                }
                Update: {
                    id?: string
                    user_id?: string
                    workflow_id?: string | null
                    title?: string
                    is_temporary?: boolean
                    created_at?: string
                    updated_at?: string
                    last_message_at?: string
                    archived_at?: string | null
                }
                Relationships: []
            }
            rune_chat_messages: {
                Row: {
                    id: string
                    chat_id: string
                    user_id: string
                    role: string
                    content: string | null
                    tool_calls: Json | null
                    tool_results: Json | null
                    usage_metadata: Json | null
                    created_at: string
                }
                Insert: {
                    id?: string
                    chat_id: string
                    user_id?: string // Handled by RLS/Trigger or explicit
                    role: string
                    content?: string | null
                    tool_calls?: Json | null
                    tool_results?: Json | null
                    usage_metadata?: Json | null
                    created_at?: string
                }
                Update: {
                    id?: string
                    chat_id?: string
                    user_id?: string
                    role?: string
                    content?: string | null
                    tool_calls?: Json | null
                    tool_results?: Json | null
                    usage_metadata?: Json | null
                    created_at?: string
                }
                Relationships: []
            }
            rune_agent_events: {
                Row: {
                    id: string
                    created_at: string
                    user_id: string
                    workflow_id: string | null
                    source_type: 'webhook' | 'schedule' | 'system'
                    payload: Json
                    dedupe_key: string
                    status: 'pending' | 'processing' | 'processed' | 'failed' | 'skipped'
                    processed_at: string | null
                    error: string | null
                }
                Insert: {
                    id?: string
                    created_at?: string
                    user_id?: string
                    workflow_id?: string | null
                    source_type: 'webhook' | 'schedule' | 'system'
                    payload?: Json
                    dedupe_key: string
                    status?: 'pending' | 'processing' | 'processed' | 'failed' | 'skipped'
                    processed_at?: string | null
                    error?: string | null
                }
                Update: {
                    id?: string
                    created_at?: string
                    user_id?: string
                    workflow_id?: string | null
                    source_type?: 'webhook' | 'schedule' | 'system'
                    payload?: Json
                    dedupe_key?: string
                    status?: 'pending' | 'processing' | 'processed' | 'failed' | 'skipped'
                    processed_at?: string | null
                    error?: string | null
                }
                Relationships: []
            }
            rune_autonomy_policies: {
                Row: {
                    id: string
                    created_at: string
                    updated_at: string
                    user_id: string
                    workflow_id: string | null
                    policy: Json
                }
                Insert: {
                    id?: string
                    created_at?: string
                    updated_at?: string
                    user_id?: string
                    workflow_id?: string | null
                    policy?: Json
                }
                Update: {
                    id?: string
                    created_at?: string
                    updated_at?: string
                    user_id?: string
                    workflow_id?: string | null
                    policy?: Json
                }
                Relationships: []
            }
            rune_agent_jobs: {
                Row: {
                    id: string
                    created_at: string
                    updated_at: string
                    user_id: string
                    workflow_id: string
                    event_id: string | null
                    status: 'pending' | 'running' | 'waiting_approval' | 'completed' | 'failed' | 'cancelled' | 'budget_exceeded'
                    triage_result: Json | null
                    plan: Json | null
                    actions_taken: Json[] | null
                    tokens_used: number
                    error: string | null
                    completed_at: string | null
                    actions_count: number
                    approval_hook_token: string | null
                    approval_requested_at: string | null
                    approval_responded_at: string | null
                    approval_response: Json | null
                }
                Insert: {
                    id?: string
                    created_at?: string
                    updated_at?: string
                    user_id?: string
                    workflow_id: string
                    event_id?: string | null
                    status?: 'pending' | 'running' | 'waiting_approval' | 'completed' | 'failed' | 'cancelled' | 'budget_exceeded'
                    triage_result?: Json | null
                    plan?: Json | null
                    actions_taken?: Json[] | null
                    tokens_used?: number
                    error?: string | null
                    completed_at?: string | null
                    actions_count?: number
                    approval_hook_token?: string | null
                    approval_requested_at?: string | null
                    approval_responded_at?: string | null
                    approval_response?: Json | null
                }
                Update: {
                    id?: string
                    created_at?: string
                    updated_at?: string
                    user_id?: string
                    workflow_id?: string
                    event_id?: string | null
                    status?: 'pending' | 'running' | 'waiting_approval' | 'completed' | 'failed' | 'cancelled' | 'budget_exceeded'
                    triage_result?: Json | null
                    plan?: Json | null
                    actions_taken?: Json[] | null
                    tokens_used?: number
                    error?: string | null
                    completed_at?: string | null
                    actions_count?: number
                    approval_hook_token?: string | null
                    approval_requested_at?: string | null
                    approval_responded_at?: string | null
                    approval_response?: Json | null
                }
                Relationships: []
            }
            rune_agent_decisions: {
                Row: {
                    id: string
                    created_at: string
                    job_id: string
                    user_id: string
                    decision_type: 'triage' | 'plan' | 'tool_call' | 'approval_request' | 'approval_response' | 'budget_check' | 'policy_check'
                    input_summary: Json
                    output_summary: Json
                    model_used: string | null
                    tokens_in: number | null
                    tokens_out: number | null
                    duration_ms: number | null
                    success: boolean
                    error: string | null
                }
                Insert: {
                    id?: string
                    created_at?: string
                    job_id: string
                    user_id?: string
                    decision_type: 'triage' | 'plan' | 'tool_call' | 'approval_request' | 'approval_response' | 'budget_check' | 'policy_check'
                    input_summary?: Json
                    output_summary?: Json
                    model_used?: string | null
                    tokens_in?: number | null
                    tokens_out?: number | null
                    duration_ms?: number | null
                    success?: boolean
                    error?: string | null
                }
                Update: {
                    id?: string
                    created_at?: string
                    job_id?: string
                    user_id?: string
                    decision_type?: 'triage' | 'plan' | 'tool_call' | 'approval_request' | 'approval_response' | 'budget_check' | 'policy_check'
                    input_summary?: Json
                    output_summary?: Json
                    model_used?: string | null
                    tokens_in?: number | null
                    tokens_out?: number | null
                    duration_ms?: number | null
                    success?: boolean
                    error?: string | null
                }
                Relationships: []
            }
        }
        Views: {
            rune_autonomy_budget_usage: {
                Row: {
                    user_id: string
                    actions_last_hour: number
                    tokens_last_hour: number
                    actions_last_day: number
                    tokens_last_day: number
                    jobs_running: number
                }
            }
        }
        Functions: {
            [_ in never]: never
        }
        Enums: {
            [_ in never]: never
        }
        CompositeTypes: {
            [_ in never]: never
        }
    }
}

// Autonomy-specific type exports for convenience
export type AgentEvent = Database['public']['Tables']['rune_agent_events']['Row'];
export type AgentEventInsert = Database['public']['Tables']['rune_agent_events']['Insert'];
export type AgentEventUpdate = Database['public']['Tables']['rune_agent_events']['Update'];

export type AutonomyPolicy = Database['public']['Tables']['rune_autonomy_policies']['Row'];
export type AutonomyPolicyInsert = Database['public']['Tables']['rune_autonomy_policies']['Insert'];
export type AutonomyPolicyUpdate = Database['public']['Tables']['rune_autonomy_policies']['Update'];

export type AgentJob = Database['public']['Tables']['rune_agent_jobs']['Row'];
export type AgentJobInsert = Database['public']['Tables']['rune_agent_jobs']['Insert'];
export type AgentJobUpdate = Database['public']['Tables']['rune_agent_jobs']['Update'];

export type AgentDecision = Database['public']['Tables']['rune_agent_decisions']['Row'];
export type AgentDecisionInsert = Database['public']['Tables']['rune_agent_decisions']['Insert'];

export type BudgetUsage = Database['public']['Views']['rune_autonomy_budget_usage']['Row'];

// Strongly-typed policy configuration
export interface AutonomyPolicyConfig {
    mode: 'OFF' | 'CONFIRM' | 'AUTONOMOUS';
    maxActionsPerHour: number;
    maxActionsPerDay: number;
    maxTokensPerHour: number;
    maxTokensPerDay: number;
    maxParallelJobs: number;
    toolAllowlist: string[];
    toolBlocklist: string[];
    triggersEnabled: {
        webhook: boolean;
        schedule: boolean;
        runCompletion: boolean;
        manualOnly: boolean;
    };
    cronSchedule?: string;
    notifyOnSuccess: boolean;
    notifyOnFailure: boolean;
    notifyOnApprovalNeeded: boolean;
}
