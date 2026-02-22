import { Node, Edge } from '@xyflow/react';
import { resolveNodeKind } from './workflow/node-catalog';

export type ValidationError = {
    type: 'error' | 'warning';
    message: string;
    nodeId?: string;
    code: string;
};

export type ValidationResult = {
    valid: boolean;
    errors: ValidationError[];
    warnings: ValidationError[];
};

function getNodeLabel(node: Node): string {
    const label = (node.data as any)?.label;
    if (typeof label === 'string' && label.trim().length > 0) {
        return label;
    }
    return node.id;
}

/**
 * Main validation function for workflow graphs
 */
export function validateGraph(nodes: Node[], edges: Edge[]): ValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    // Find trigger node(s)
    const triggerNodes = nodes.filter((node) => {
        const kind = resolveNodeKind(node as any);
        return kind === 'startWorkflow' || kind === 'webhook' || kind === 'schedule';
    });

    if (triggerNodes.length === 0) {
        errors.push({
            type: 'error',
            message: 'Workflow must have at least one Trigger node (Start, Webhook, or Schedule)',
            code: 'NO_TRIGGER_NODE'
        });
        return { valid: false, errors, warnings };
    }

    // Use the first trigger for connectivity checks if multiple exist
    // (Ideally we should check connectivity from ALL triggers)
    const startNode = triggerNodes[0];

    // Detect disconnected nodes
    const disconnected = detectDisconnectedNodes(nodes, edges, startNode.id);
    disconnected.forEach(nodeId => {
        const node = nodes.find(n => n.id === nodeId);
        warnings.push({
            type: 'warning',
            message: `Node "${node ? getNodeLabel(node) : nodeId}" is not connected to the workflow`,
            nodeId,
            code: 'DISCONNECTED_NODE'
        });
    });

    // Detect cycles
    const cycles = detectCycles(nodes, edges, startNode.id);
    if (cycles.length > 0) {
        cycles.forEach(cycle => {
            errors.push({
                type: 'error',
                message: `Cycle detected: ${cycle.join(' → ')}`,
                code: 'CYCLE_DETECTED'
            });
        });
    }

    // Validate each node's configuration
    nodes.forEach(node => {
        const nodeErrors = validateNodeConfiguration(node);
        errors.push(...nodeErrors.filter(e => e.type === 'error'));
        warnings.push(...nodeErrors.filter(e => e.type === 'warning'));
    });

    return {
        valid: errors.length === 0,
        errors,
        warnings
    };
}

/**
 * Detect nodes that are not reachable from the start node
 */
function detectDisconnectedNodes(nodes: Node[], edges: Edge[], startNodeId: string): string[] {
    const reachable = new Set<string>();
    const visited = new Set<string>();

    function dfs(nodeId: string) {
        if (visited.has(nodeId)) return;
        visited.add(nodeId);
        reachable.add(nodeId);

        // Find all outgoing edges
        const outgoing = edges.filter(e => e.source === nodeId);
        outgoing.forEach(edge => {
            dfs(edge.target);
        });
    }

    dfs(startNodeId);

    // Return nodes that are not reachable
    return nodes
        .filter(n => !reachable.has(n.id))
        .map(n => n.id);
}

/**
 * Detect cycles in the graph using DFS
 */
function detectCycles(nodes: Node[], edges: Edge[], startNodeId: string): string[][] {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const cycles: string[][] = [];
    const currentPath: string[] = [];

    function dfs(nodeId: string): boolean {
        visited.add(nodeId);
        recursionStack.add(nodeId);
        currentPath.push(nodeId);

        const outgoing = edges.filter(e => e.source === nodeId);

        for (const edge of outgoing) {
            const targetId = edge.target;

            if (!visited.has(targetId)) {
                if (dfs(targetId)) {
                    return true;
                }
            } else if (recursionStack.has(targetId)) {
                // Cycle detected
                const cycleStartIndex = currentPath.indexOf(targetId);
                const cycle = currentPath.slice(cycleStartIndex);
                const cycleLabels = cycle.map(id => {
                    const node = nodes.find(n => n.id === id);
                    return String(node?.data?.label || id);
                });
                cycles.push([...cycleLabels, cycleLabels[0]]);
                return true;
            }
        }

        currentPath.pop();
        recursionStack.delete(nodeId);
        return false;
    }

    dfs(startNodeId);

    return cycles;
}

/**
 * Validate a single node's configuration
 */
function validateNodeConfiguration(node: Node): ValidationError[] {
    const errors: ValidationError[] = [];
    const nodeKind = resolveNodeKind(node as any);
    const nodeLabel = getNodeLabel(node);

    // Check for required fields based on node type
    if (nodeKind === 'httpRequest') {
        const config = (node.data as any).httpRequest;
        if (!config?.url) {
            errors.push({
                type: 'error',
                message: `HTTP Request node "${nodeLabel}" is missing URL`,
                nodeId: node.id,
                code: 'MISSING_REQUIRED_FIELD'
            });
        }
    }

    if (nodeKind === 'sendEmail') {
        const config = (node.data as any).emailConfig;
        if (!config?.recipient) {
            errors.push({
                type: 'warning',
                message: `Email node "${nodeLabel}" is missing recipient`,
                nodeId: node.id,
                code: 'MISSING_RECOMMENDED_FIELD'
            });
        }
    }

    if (nodeKind === 'databaseQuery') {
        const config = (node.data as any).dbConfig;
        const dbType = config?.dbType || 'postgres';

        // Validate dbType
        const validDbTypes = ['postgres', 'mysql', 'mongodb', 'generic'];
        if (config?.dbType && !validDbTypes.includes(config.dbType)) {
            errors.push({
                type: 'error',
                message: `Database node has invalid database type: ${config.dbType}`,
                nodeId: node.id,
                code: 'INVALID_DB_TYPE'
            });
        }

        if (!config?.connectionString) {
            errors.push({
                type: 'error',
                message: `Database node (${dbType}) is missing connection string`,
                nodeId: node.id,
                code: 'MISSING_REQUIRED_FIELD'
            });
        }
        if (!config?.query) {
            errors.push({
                type: 'error',
                message: `Database node (${dbType}) is missing ${dbType === 'mongodb' ? 'operation' : 'query'}`,
                nodeId: node.id,
                code: 'MISSING_REQUIRED_FIELD'
            });
        }

        // Validate MongoDB operation JSON if applicable
        if (dbType === 'mongodb' && config?.query) {
            try {
                const parsed = JSON.parse(config.query);
                if (!parsed.collection || !parsed.operation) {
                    errors.push({
                        type: 'warning',
                        message: `MongoDB operation should include 'collection' and 'operation' fields`,
                        nodeId: node.id,
                        code: 'INVALID_MONGODB_OPERATION'
                    });
                }
            } catch (e) {
                errors.push({
                    type: 'error',
                    message: `MongoDB operation must be valid JSON`,
                    nodeId: node.id,
                    code: 'INVALID_JSON'
                });
            }
        }
    }

    if (nodeKind === 'subWorkflow') {
        const workflowId = (node.data as any).workflowId;
        if (!workflowId) {
            errors.push({
                type: 'error',
                message: `Sub-Workflow node is missing workflow ID`,
                nodeId: node.id,
                code: 'MISSING_REQUIRED_FIELD'
            });
        }
    }

    // Validate serialization of parameters
    const serializationErrors = validateSerialization(node);
    errors.push(...serializationErrors);

    return errors;
}

/**
 * Check that node parameters are serializable (JSON-compatible)
 */
function validateSerialization(node: Node): ValidationError[] {
    const errors: ValidationError[] = [];

    // Check common config fields for serialization issues
    const configFields = [
        { key: 'httpRequest', label: 'HTTP Request' },
        { key: 'emailConfig', label: 'Email' },
        { key: 'dbConfig', label: 'Database' },
        { key: 'scriptConfig', label: 'Script' },
        { key: 'slackConfig', label: 'Slack' },
        { key: 'params', label: 'Parameters' }
    ];

    configFields.forEach(({ key, label }) => {
        const value = (node.data as any)[key];
        if (value !== undefined && value !== null) {
            try {
                // Try to serialize and deserialize
                JSON.parse(JSON.stringify(value));
            } catch (e) {
                errors.push({
                    type: 'error',
                    message: `${label} configuration contains non-serializable values`,
                    nodeId: node.id,
                    code: 'NON_SERIALIZABLE_VALUE'
                });
            }
        }
    });

    // Check for JSON string fields (params, body, etc.)
    if ((node.data as any).params) {
        try {
            JSON.parse((node.data as any).params);
        } catch (e) {
            errors.push({
                type: 'error',
                message: `Invalid JSON in parameters field`,
                nodeId: node.id,
                code: 'INVALID_JSON'
            });
        }
    }

    if ((node.data as any).httpRequest?.body) {
        try {
            JSON.parse((node.data as any).httpRequest.body);
        } catch (e) {
            errors.push({
                type: 'warning',
                message: `HTTP Request body should be valid JSON`,
                nodeId: node.id,
                code: 'INVALID_JSON'
            });
        }
    }

    return errors;
}
