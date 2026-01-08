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
    async deployVersion(supabase: SupabaseClient, workflowId: string, graph: any, code: string, commitMessage?: string): Promise<WorkflowVersion> {

        // 1. Get current max version
        const { data: maxVerData } = await supabase
            .from('rune_workflow_versions')
            .select('version')
            .eq('workflow_id', workflowId)
            .order('version', { ascending: false })
            .limit(1)
            .single();

        // Handle "no versions exist" case (count on error)
        const nextVersion = (maxVerData?.version || 0) + 1;

        // 2. Insert new version
        const insertPayload = {
            workflow_id: workflowId,
            version: nextVersion,
            graph_json: graph, // Map to DB column
            code,
            commit_message: commitMessage,
            // created_at handled by default
        };

        const { data, error: insertError } = await supabase
            .from('rune_workflow_versions')
            .insert(insertPayload)
            .select()
            .single();

        if (insertError) throw insertError;

        // Map back to interface
        return {
            ...data,
            graph: data.graph_json,
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
            .select('code')
            .eq('id', versionId)
            .single();

        if (error) return null;
        return data.code;
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
