
import { z } from 'zod';

export const ModelProviderSchema = z.enum(['google', 'vertex', 'openai', 'anthropic']);

export const OutputModeSchema = z.enum(['text', 'json', 'schema_json']);

export const ToolExecutionPolicySchema = z.enum(['always_confirm', 'confirm_high_impact', 'auto']);

export const AgentConfigSchema = z.object({
    // Identification
    // Note: stored externally in DB columns, but useful to have in type def
    model: z.string().min(1, "Model is required"),
    provider: ModelProviderSchema.default('google'),
    providerKeyRef: z.string().trim().min(1).max(128).optional(),

    // Generation Params
    temperature: z.number().min(0).max(2).default(0.7),
    topP: z.number().min(0).max(1).optional(),
    maxTokens: z.number().int().min(1).optional(),
    frequencyPenalty: z.number().min(-2).max(2).optional(), // Only for supported models
    presencePenalty: z.number().min(-2).max(2).optional(), // Only for supported models
    stopSequences: z.array(z.string()).max(5).optional(),

    // Output
    outputMode: OutputModeSchema.default('text'),
    responseSchema: z.record(z.string(), z.any()).optional(), // JSON Schema object

    // Capabilities
    tools: z.array(z.string()).default([]), // List of enabled tool IDs
    toolExecutionPolicy: ToolExecutionPolicySchema.default('confirm_high_impact'),
    thinking: z.object({
        enabled: z.boolean(),
        budget: z.number().optional(),
        level: z.enum(['include', 'minimal']).optional()
    }).optional(),

    // Safety & Limits
    maxToolCalls: z.number().int().min(0).max(50).default(10),
    maxSteps: z.number().int().min(1).max(100).default(20),

    // Memory
    persistHistory: z.boolean().default(true),

    // System
    systemPrompt: z.string().optional(),
});

export type AgentConfig = z.infer<typeof AgentConfigSchema>;

export const PartialAgentConfigSchema = AgentConfigSchema.partial();
