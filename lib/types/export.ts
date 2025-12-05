import { Node, Edge } from '@xyflow/react';

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

    /** Workflow metadata */
    meta: WorkflowMeta;

    /** ReactFlow nodes array */
    nodes: Node[];

    /** ReactFlow edges array */
    edges: Edge[];

    /** Generated TypeScript code (optional) */
    code?: string;
}
