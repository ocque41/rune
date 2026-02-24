import { Node, Edge } from '@xyflow/react';
import type { WorkflowMode, WorkflowModeConfig } from '@/lib/workflow/modes';

/**
 * Metadata for an exported workflow
 */
export interface WorkflowMeta {
    name: string;
    description?: string;
    createdAt?: string;
}

/**
 * Complete exported workflow format
 * Includes all necessary data to restore a workflow graph
 */
export interface ExportedWorkflow {
    /** Format version for future compatibility */
    version: string;

    /** Unique Identifier for the workflow */
    id: string;

    /** Workflow metadata */
    meta: WorkflowMeta;

    /** Graph behavior mode */
    workflow_mode?: WorkflowMode;

    /** Optional mode configuration */
    workflow_mode_config?: WorkflowModeConfig;

    /** ReactFlow nodes array */
    nodes: Node[];

    /** ReactFlow edges array */
    edges: Edge[];

    /** Generated TypeScript code (optional) */
    code?: string;
}
