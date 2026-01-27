export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export type Database = {
    // Allows to automatically instantiate createClient with right options
    // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
    __InternalSupabase: {
        PostgrestVersion: "13.0.5"
    }
    public: {
        Tables: {
            rune_chats: {
                Row: {
                    id: string
                    user_id: string
                    workflow_id: string | null
                    title: string | null
                    is_temporary: boolean | null
                    created_at: string | null
                    updated_at: string | null
                }
                Insert: {
                    id?: string
                    user_id: string
                    workflow_id?: string | null
                    title?: string | null
                    is_temporary?: boolean | null
                    created_at?: string | null
                    updated_at?: string | null
                }
                Update: {
                    id?: string
                    user_id?: string
                    workflow_id?: string | null
                    title?: string | null
                    is_temporary?: boolean | null
                    created_at?: string | null
                    updated_at?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "rune_chats_workflow_id_fkey"
                        columns: ["workflow_id"]
                        isOneToOne: false
                        referencedRelation: "rune_workflows"
                        referencedColumns: ["id"]
                    }
                ]
            }
            rune_chat_messages: {
                Row: {
                    id: string
                    chat_id: string
                    role: "user" | "assistant" | "system" | "tool"
                    content: string | null
                    tool_calls: Json | null
                    tool_call_id: string | null
                    created_at: string | null
                }
                Insert: {
                    id?: string
                    chat_id: string
                    role: "user" | "assistant" | "system" | "tool"
                    content?: string | null
                    tool_calls?: Json | null
                    tool_call_id?: string | null
                    created_at?: string | null
                }
                Update: {
                    id?: string
                    chat_id?: string
                    role?: "user" | "assistant" | "system" | "tool"
                    content?: string | null
                    tool_calls?: Json | null
                    tool_call_id?: string | null
                    created_at?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "rune_chat_messages_chat_id_fkey"
                        columns: ["chat_id"]
                        isOneToOne: false
                        referencedRelation: "rune_chats"
                        referencedColumns: ["id"]
                    }
                ]
            }
            rune_webhook_endpoints: {
                Row: {
                    id: string
                    created_at: string
                    updated_at: string
                    user_id: string
                    workflow_id: string | null
                    name: string
                    secret_hash: string
                    description: string | null
                    is_active: boolean
                }
                Insert: {
                    id?: string
                    created_at?: string
                    updated_at?: string
                    user_id: string
                    workflow_id?: string | null
                    name: string
                    secret_hash: string
                    description?: string | null
                    is_active?: boolean
                }
                Update: {
                    id?: string
                    created_at?: string
                    updated_at?: string
                    user_id?: string
                    workflow_id?: string | null
                    name?: string
                    secret_hash?: string
                    description?: string | null
                    is_active?: boolean
                }
            }
            rune_approval_tokens: {
                Row: {
                    id: string
                    job_id: string
                    token_hash: string
                    action: string
                    created_at: string
                    expires_at: string
                    used_at: string | null
                }
                Insert: {
                    id?: string
                    job_id: string
                    token_hash: string
                    action: string
                    created_at?: string
                    expires_at?: string
                    used_at?: string | null
                }
                Update: {
                    id?: string
                    job_id?: string
                    token_hash?: string
                    action?: string
                    created_at?: string
                    expires_at?: string
                    used_at?: string | null
                }
            }
            rune_agent_events: {
                Row: {
                    created_at: string
                    dedupe_key: string | null
                    event_type: string
                    id: string
                    payload: Json
                    processed_at: string | null
                    processing_metadata: Json | null
                    source_type: string
                    status: string
                    user_id: string
                    workflow_id: string | null
                }
                Insert: {
                    created_at?: string
                    dedupe_key?: string | null
                    event_type?: string
                    id?: string
                    payload?: Json
                    processed_at?: string | null
                    processing_metadata?: Json | null
                    source_type: string
                    status?: string
                    user_id: string
                    workflow_id?: string | null
                }
                Update: {
                    created_at?: string
                    dedupe_key?: string | null
                    event_type?: string
                    id?: string
                    payload?: Json
                    processed_at?: string | null
                    processing_metadata?: Json | null
                    source_type?: string
                    status?: string
                    user_id?: string
                    workflow_id?: string | null
                }
                Relationships: []
            }
            rune_agent_jobs: {
                Row: {
                    context: Json | null
                    created_at: string
                    event_id: string | null
                    id: string
                    plan: Json | null
                    priority: string
                    result: Json | null
                    status: string
                    title: string
                    updated_at: string
                    user_id: string
                    workflow_id: string | null
                    approval_responded_at: string | null
                    approval_response: Json | null
                    leased_until: string | null
                    worker_id: string | null
                }
                Insert: {
                    context?: Json | null
                    created_at?: string
                    event_id?: string | null
                    id?: string
                    plan?: Json | null
                    priority?: string
                    result?: Json | null
                    status?: string
                    title: string
                    updated_at?: string
                    user_id: string
                    workflow_id?: string | null
                    approval_responded_at?: string | null
                    approval_response?: Json | null
                    leased_until?: string | null
                    worker_id?: string | null
                }
                Update: {
                    context?: Json | null
                    created_at?: string
                    event_id?: string | null
                    id?: string
                    plan?: Json | null
                    priority?: string
                    result?: Json | null
                    status?: string
                    title?: string
                    updated_at?: string
                    user_id?: string
                    workflow_id?: string | null
                    approval_responded_at?: string | null
                    approval_response?: Json | null
                    leased_until?: string | null
                    worker_id?: string | null
                }
                Relationships: [
                    {
                        foreignKeyName: "rune_agent_jobs_event_id_fkey"
                        columns: ["event_id"]
                        isOneToOne: false
                        referencedRelation: "rune_agent_events"
                        referencedColumns: ["id"]
                    }
                ]
            }
            rune_autonomy_policies: {
                Row: {
                    created_at: string
                    id: string
                    policy: Json
                    updated_at: string
                    user_id: string
                    workflow_id: string | null
                    tool_allowlist: string[] | null
                    tool_blocklist: string[] | null
                    domain_allowlist: string[] | null
                }
                Insert: {
                    created_at?: string
                    id?: string
                    policy: Json
                    updated_at?: string
                    user_id: string
                    workflow_id?: string | null
                    tool_allowlist?: string[] | null
                    tool_blocklist?: string[] | null
                    domain_allowlist?: string[] | null
                }
                Update: {
                    created_at?: string
                    id?: string
                    policy?: Json
                    updated_at?: string
                    user_id?: string
                    workflow_id?: string | null
                    tool_allowlist?: string[] | null
                    tool_blocklist?: string[] | null
                    domain_allowlist?: string[] | null
                }
                Relationships: [
                    {
                        foreignKeyName: "rune_autonomy_policies_workflow_id_fkey"
                        columns: ["workflow_id"]
                        isOneToOne: false
                        referencedRelation: "rune_workflows"
                        referencedColumns: ["id"]
                    }
                ]
            }
            rune_autonomy_budget_usage: {
                Row: {
                    actions_last_day: number | null
                    actions_last_hour: number | null
                    jobs_running: number | null
                    tokens_last_day: number | null
                    tokens_last_hour: number | null
                    user_id: string | null
                }
                Insert: {
                    actions_last_day?: number | null
                    actions_last_hour?: number | null
                    jobs_running?: number | null
                    tokens_last_day?: number | null
                    tokens_last_hour?: number | null
                    user_id?: string | null
                }
                Update: {
                    actions_last_day?: number | null
                    actions_last_hour?: number | null
                    jobs_running?: number | null
                    tokens_last_day?: number | null
                    tokens_last_hour?: number | null
                    user_id?: string | null
                }
                Relationships: []
            }
            rune_workflows: {
                Row: {
                    id: string,
                    webhook_secret: string | null,
                    user_id: string
                    // ... truncated for brevity, we focus on autonomy fields
                }
                Insert: {
                    id?: string,
                    webhook_secret?: string | null,
                    user_id: string
                }
                Update: {
                    webhook_secret?: string | null
                }
            }
        }
        Views: {
            [_ in never]: never
        }
        Functions: {
            [_ in never]: never
        }
        Enums: {
            agent_config_scope: "global" | "workflow" | "node" | "user_default"
        }
        CompositeTypes: {
            [_ in never]: never
        }
    }
}

export type Tables<
    PublicTableNameOrOptions extends
    | keyof (Database["public"]["Tables"] & Database["public"]["Views"])
    | { schema: "public" },
    TableName extends PublicTableNameOrOptions extends { schema: "public" }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: "public" }
    ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
            Row: infer R
        }
    ? R
    : never
    : PublicTableNameOrOptions extends keyof (Database["public"]["Tables"] &
        Database["public"]["Views"])
    ? (Database["public"]["Tables"] &
        Database["public"]["Views"])[PublicTableNameOrOptions] extends {
            Row: infer R
        }
    ? R
    : never
    : never

// Manual types for Policy Logic
export interface AutonomyPolicyConfig {
    mode: 'OFF' | 'CONFIRM' | 'AUTONOMOUS';
    maxActionsPerHour: number;
    maxActionsPerDay: number;
    maxTokensPerHour: number;
    maxTokensPerDay: number;
    maxParallelJobs: number;
    toolAllowlist: string[];
    toolBlocklist: string[];
    domainAllowlist?: string[]; // New
    triggersEnabled: {
        webhook: boolean;
        schedule: boolean;
        runCompletion: boolean;
        manualOnly: boolean;
    };
    notifyOnSuccess: boolean;
    notifyOnFailure: boolean;
    notifyOnApprovalNeeded: boolean;
}

export interface BudgetUsage {
    user_id: string;
    actions_last_hour: number;
    actions_last_day: number;
    tokens_last_hour: number;
    tokens_last_day: number;
    jobs_running: number;
}

export type AgentEventInsert = Database['public']['Tables']['rune_agent_events']['Insert'];
