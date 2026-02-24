import { SupabaseClient } from '@supabase/supabase-js';
import { Node, Edge } from '@xyflow/react';
import { LLMConfig } from './types/agent';
import {
    DEFAULT_WORKFLOW_MODE,
    normalizeWorkflowMode,
    normalizeWorkflowModeConfig,
    type WorkflowMode,
    type WorkflowModeConfig,
} from './workflow/modes';

export interface WorkflowGraph {
    nodes: Node[];
    edges: Edge[];
    agentConfig?: LLMConfig;
    [key: string]: unknown;
}

export interface WorkflowData {
    id: string;
    name: string;
    description?: string;
    graph: WorkflowGraph;
    code?: string;
    is_active: boolean;
    updated_at: string;
    workflow_mode: WorkflowMode;
    workflow_mode_config: WorkflowModeConfig;
    version_number?: number;
}

export interface WorkflowVersion {
    id: string;
    workflow_id: string;
    version_number: number;
    version: number;
    graph: WorkflowGraph;
    code: string;
    deployed_at: string;
    workflow_mode: WorkflowMode;
    workflow_mode_config: WorkflowModeConfig;
    commit_message?: string;
}

function normalizeGraph(raw: unknown): WorkflowGraph {
    const graph = raw && typeof raw === 'object' ? (raw as Partial<WorkflowGraph>) : {};
    return {
        ...graph,
        nodes: Array.isArray(graph.nodes) ? graph.nodes : [],
        edges: Array.isArray(graph.edges) ? graph.edges : [],
    };
}

function readModeFromRecord(record: any): { mode: WorkflowMode; modeConfig: WorkflowModeConfig } {
    const mode = normalizeWorkflowMode(
        record?.workflow_mode ?? record?.definition_json?.workflow_mode ?? DEFAULT_WORKFLOW_MODE,
    );
    const modeConfig = normalizeWorkflowModeConfig(
        mode,
        record?.workflow_mode_config ?? record?.definition_json?.workflow_mode_config ?? {},
    );

    return { mode, modeConfig };
}

/**
 * Workflow Store
 * Canonical writes use graph_json + workflow_mode + workflow_mode_config.
 * Read compatibility supports legacy graph/definition_json fields.
 */
export const workflowStore = {
    async getWorkflow(supabase: SupabaseClient, id: string): Promise<WorkflowData | null> {
        const { data, error } = await supabase
            .from('rune_workflows')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        if (!data) return null;

        const graph = normalizeGraph(data.graph_json ?? data.graph ?? data.definition_json?.graph);
        const { mode, modeConfig } = readModeFromRecord(data);

        return {
            ...data,
            graph,
            workflow_mode: mode,
            workflow_mode_config: modeConfig,
            version_number: data.version_number ?? data.version,
        } as WorkflowData;
    },

    async saveDraft(
        supabase: SupabaseClient,
        id: string,
        updates: Partial<WorkflowData>,
        currentVersion?: number,
    ): Promise<void> {
        const mode = normalizeWorkflowMode(updates.workflow_mode ?? DEFAULT_WORKFLOW_MODE);
        const modeConfig = normalizeWorkflowModeConfig(mode, updates.workflow_mode_config ?? {});

        const updatePayload: Record<string, unknown> = {
            updated_at: new Date().toISOString(),
        };

        if (updates.name !== undefined) updatePayload.name = updates.name;
        if (updates.description !== undefined) updatePayload.description = updates.description;
        if (updates.code !== undefined) updatePayload.code = updates.code;
        if (updates.is_active !== undefined) updatePayload.is_active = updates.is_active;
        if (updates.graph !== undefined) updatePayload.graph_json = updates.graph;
        if (updates.workflow_mode !== undefined) updatePayload.workflow_mode = mode;
        if (updates.workflow_mode_config !== undefined) updatePayload.workflow_mode_config = modeConfig;

        let query = supabase
            .from('rune_workflows')
            .update(updatePayload)
            .eq('id', id);

        if (currentVersion !== undefined) {
            updatePayload.version_number = currentVersion + 1;
            query = query.eq('version_number', currentVersion);
        }

        const { error, data } = await query.select('id');
        if (error) throw error;

        if (currentVersion !== undefined && (!data || data.length === 0)) {
            throw new Error(`Conflict: workflow was changed elsewhere (version ${currentVersion}).`);
        }
    },

    async deployVersion(
        supabase: SupabaseClient,
        workflowId: string,
        graph: WorkflowGraph,
        code: string,
        commitMessage?: string,
        userId?: string,
        workflowMode: WorkflowMode = DEFAULT_WORKFLOW_MODE,
        workflowModeConfig: WorkflowModeConfig = {},
    ): Promise<WorkflowVersion> {
        const { data: latestVersion } = await supabase
            .from('rune_workflow_versions')
            .select('version_number')
            .eq('workflow_id', workflowId)
            .order('version_number', { ascending: false })
            .limit(1)
            .single();

        const nextVersion = (latestVersion?.version_number || 0) + 1;
        const normalizedMode = normalizeWorkflowMode(workflowMode);
        const normalizedModeConfig = normalizeWorkflowModeConfig(normalizedMode, workflowModeConfig);

        const insertPayload = {
            workflow_id: workflowId,
            user_id: userId,
            version_number: nextVersion,
            workflow_mode: normalizedMode,
            workflow_mode_config: normalizedModeConfig,
            definition_json: {
                graph,
                code,
                commit_message: commitMessage,
                workflow_mode: normalizedMode,
                workflow_mode_config: normalizedModeConfig,
            },
        };

        const { data, error: insertError } = await supabase
            .from('rune_workflow_versions')
            .insert(insertPayload)
            .select()
            .single();

        if (insertError) throw insertError;

        const { mode, modeConfig } = readModeFromRecord(data);

        return {
            ...data,
            version: data.version_number,
            version_number: data.version_number,
            graph: normalizeGraph(data.definition_json?.graph ?? data.graph_json ?? data.graph),
            code: data.definition_json?.code ?? code,
            commit_message: data.definition_json?.commit_message,
            deployed_at: data.created_at ?? new Date().toISOString(),
            workflow_mode: mode,
            workflow_mode_config: modeConfig,
        } as WorkflowVersion;
    },

    async getVersionCode(supabase: SupabaseClient, versionId: string): Promise<string | null> {
        const { data, error } = await supabase
            .from('rune_workflow_versions')
            .select('definition_json')
            .eq('id', versionId)
            .single();

        if (error) return null;
        return data?.definition_json?.code || null;
    },

    async deleteWorkflow(supabase: SupabaseClient, id: string): Promise<void> {
        const { error } = await supabase
            .from('rune_workflows')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },
};
