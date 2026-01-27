
import { SupabaseClient } from '@supabase/supabase-js';
import { AgentConfig as InternalAgentConfig, AgentConfigSchema } from './config-schema';

export const AgentConfigValidation = AgentConfigSchema;
export type AgentConfig = InternalAgentConfig;
export { AgentConfigSchema };

export interface AgentMessage {
    role: 'system' | 'user' | 'assistant' | 'tool';
    content?: string;
    toolCalls?: ToolCall[];
    toolResult?: ToolResult;
    id?: string;
    thoughtSignature?: string; // Add this for Gemini 3
    approval_status?: 'pending' | 'approved' | 'rejected';
}

export interface ToolCall {
    id: string;
    name: string;
    arguments: Record<string, any>;
}

export interface ToolResult {
    toolCallId: string;
    output: string; // JSON stringified result
    isError?: boolean;
}

export interface AgentProvider {
    generate(
        messages: AgentMessage[],
        tools: any[], // Provider-specific tool definitions
        config: AgentConfig
    ): Promise<ProviderResponse>;
}

export interface ProviderResponse {
    message: AgentMessage;
    finishReason: 'stop' | 'tool_calls' | 'length' | 'content_filter' | 'error';
    usage?: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
}

// Runtime Options
export interface RuntimeOptions {
    maxRounds?: number;
    autonomousMode?: boolean;
    sessionId?: string;
    workflowId?: string;
    chatId?: string;
}

