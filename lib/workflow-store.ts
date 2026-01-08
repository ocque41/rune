import { createAdminClient } from '@/lib/supabase/server';
// import { Database } from '@/lib/database.types'; 
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
}

export interface WorkflowVersion {
    id: string;
    workflow_id: string;
    version: number;
    graph: any;
    code: string;
    deployed_at: string;
}

/**
 * Workflow Store
 * Handles CRUD for workflows and ensures immutable versioning on deployment.
 */
export const workflowStore = {

    /**
     * Get a workflow by ID
     */
    async getWorkflow(id: string): Promise<WorkflowData | null> {
        const supabase = createAdminClient();
        const { data, error } = await supabase
            .from('rune_workflows')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Save a workflow draft (mutable)
     * This updates the 'current' state of the workflow without creating a version.
     */
    async saveDraft(id: string, updates: Partial<WorkflowData>): Promise<void> {
        const supabase = createAdminClient();
        const { error } = await supabase
            .from('rune_workflows')
            .update({
                ...updates,
                updated_at: new Date().toISOString()
            })
            .eq('id', id);

        if (error) throw error;
    },

    /**
     * Deploy a NEW VERSION of the workflow
     * 1. Fetches the current latest version number
     * 2. Inserts a new immutable record into rune_workflow_versions
     */
    async deployVersion(workflowId: string, graph: any, code: string, commitMessage?: string): Promise<WorkflowVersion> {
        const supabase = createAdminClient();

        // 1. Get current max version
        const { data: maxVerData } = await supabase
            .from('rune_workflow_versions')
            .select('version')
            .eq('workflow_id', workflowId)
            .order('version', { ascending: false })
            .limit(1)
            .single();

        // Handle "no versions exist" case
        const nextVersion = (maxVerData?.version || 0) + 1;

        // 2. Insert new version
        const { data, error: insertError } = await supabase
            .from('rune_workflow_versions')
            .insert({
                workflow_id: workflowId,
                version: nextVersion,
                graph,
                code,
                deployed_at: new Date().toISOString(),
                commit_message: commitMessage
            })
            .select()
            .single();

        if (insertError) throw insertError;

        return data;
    },

    /**
     * Get the deployed code for a specific version
     */
    async getVersionCode(versionId: string): Promise<string | null> {
        const supabase = createAdminClient();
        const { data, error } = await supabase
            .from('rune_workflow_versions')
            .select('code')
            .eq('id', versionId)
            .single();

        if (error) return null;
        return data.code;
    }
};
