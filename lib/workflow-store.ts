import { SupabaseClient } from '@supabase/supabase-js';
import { Node, Edge } from '@xyflow/react';
import { LLMConfig } from './types/agent';

export interface WorkflowData {
    id: string;
    name: string;
    description?: string;
    graph: {
        nodes: Node[];
        edges: Edge[];
        agentConfig?: LLMConfig;
    };
    code?: string;
    is_active: boolean;
    updated_at: string;
    version?: number; // Optimistic locking
}

export interface WorkflowVersion {
    id: string;
    workflow_id: string;
    version: number;
    graph: any;
    code: string;
    deployed_at: string;
    commit_message?: string;
}

/**
 * Workflow Store
 * Handles CRUD for workflows and ensures immutable versioning on deployment.
 */
export const workflowStore = {

    /**
     * Get a workflow by ID
     */
    async getWorkflow(supabase: SupabaseClient, id: string): Promise<WorkflowData | null> {
        const { data, error } = await supabase
            .from('rune_workflows')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        if (!data) return null;

        // Map graph_json to graph
        return {
            ...data,
            graph: data.graph_json
        } as WorkflowData;
    },

    /**
     * Save a workflow draft (mutable)
     */
    async saveDraft(supabase: SupabaseClient, id: string, updates: Partial<WorkflowData>, currentVersion?: number): Promise<void> {

        // Map updates to DB columns
        const updatePayload: any = { ...updates };
        if (updates.graph) {
            updatePayload.graph_json = updates.graph;
            delete updatePayload.graph;
        }
        updatePayload.updated_at = new Date().toISOString();

        let query = supabase
            .from('rune_workflows')
            .update(updatePayload)
            .eq('id', id);

        // Optimistic Locking Check
        if (currentVersion !== undefined) {
            updatePayload.version = currentVersion + 1;
            query = supabase
                .from('rune_workflows')
                .update(updatePayload)
                .eq('id', id)
                .eq('version', currentVersion);
        }

        const { error, count, data } = await query.select();

        if (error) throw error;

        if (currentVersion !== undefined) {
            if (!data || data.length === 0) {
                throw new Error(`Conflict: Workflow has been modified by another process. (ver ${currentVersion})`);
            }
        }
    },

    /**
     * Deploy a NEW VERSION of the workflow
     */
    async deployVersion(supabase: SupabaseClient, workflowId: string, graph: any, code: string, commitMessage?: string, userId?: string): Promise<WorkflowVersion> {

        // 1. Get current max version
        const { data: maxVerData } = await supabase
            .from('rune_workflow_versions')
            .select('version_number')
            .eq('workflow_id', workflowId)
            .order('version_number', { ascending: false })
            .limit(1)
            .single();

        // Handle "no versions exist" case (count on error)
        const nextVersion = (maxVerData?.version_number || 0) + 1;

        // 2. Insert new version
        // Production schema uses 'version_number' and 'definition_json' (a combined JSONB column)
        // user_id is required for RLS policy: auth.uid() = user_id
        const insertPayload = {
            workflow_id: workflowId,
            user_id: userId,
            version_number: nextVersion,
            definition_json: {
                graph: graph,
                code: code,
                commit_message: commitMessage,
            },
            // created_at handled by default
        };

        const { data, error: insertError } = await supabase
            .from('rune_workflow_versions')
            .insert(insertPayload)
            .select()
            .single();

        if (insertError) throw insertError;

        // Map back to interface (production uses definition_json nested structure)
        return {
            ...data,
            version: data.version_number,
            graph: data.definition_json?.graph,
            code: data.definition_json?.code,
            commit_message: data.definition_json?.commit_message,
            deployed_at: data.created_at
        } as WorkflowVersion;
    },

    /**
     * Get the deployed code for a specific version
     */
    /**
     * Get the deployed code for a specific version
     */
    async getVersionCode(supabase: SupabaseClient, versionId: string): Promise<string | null> {
        const { data, error } = await supabase
            .from('rune_workflow_versions')
            .select('definition_json')
            .eq('id', versionId)
            .single();

        if (error) return null;
        return data.definition_json?.code || null;
    },

    /**
     * Delete a workflow
     */
    async deleteWorkflow(supabase: SupabaseClient, id: string): Promise<void> {
        const { error } = await supabase
            .from('rune_workflows')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }
};
