import { Node, Edge } from '@xyflow/react';
import { resolveNodeKind } from './workflow/node-catalog';
import { normalizeWorkflowMode, type WorkflowMode } from './workflow/modes';

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

export interface ValidateGraphOptions {
    mode?: WorkflowMode;
}

const LINEAL_BLOCKED_KINDS = new Set(['ifElse', 'parallel', 'loop']);

function getNodeLabel(node: Node): string {
    const label = (node.data as any)?.label;
    if (typeof label === 'string' && label.trim().length > 0) {
        return label;
    }
    return node.id;
}

export function validateGraph(
    nodes: Node[],
    edges: Edge[],
    options?: ValidateGraphOptions,
): ValidationResult {
    const mode = normalizeWorkflowMode(options?.mode);
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    const triggerNodes = nodes.filter((node) => {
        const kind = resolveNodeKind(node as any);
        return kind === 'startWorkflow' || kind === 'webhook' || kind === 'schedule';
    });

    if (triggerNodes.length === 0) {
        errors.push({
            type: 'error',
            message: 'Add one start point to your workflow (Start, Webhook, or Schedule).',
            code: 'NO_TRIGGER_NODE',
        });
        return { valid: false, errors, warnings };
    }

    const disconnected = detectDisconnectedNodes(nodes, edges, triggerNodes.map((node) => node.id));
    disconnected.forEach((nodeId) => {
        const node = nodes.find((candidate) => candidate.id === nodeId);
        warnings.push({
            type: 'warning',
            message: `"${node ? getNodeLabel(node) : nodeId}" is not connected from any start point.`,
            nodeId,
            code: 'DISCONNECTED_NODE',
        });
    });

    const cycles = detectCycles(nodes, edges);
    applyModeRules(mode, nodes, edges, cycles, errors, warnings);

    nodes.forEach((node) => {
        const nodeErrors = validateNodeConfiguration(node);
        errors.push(...nodeErrors.filter((item) => item.type === 'error'));
        warnings.push(...nodeErrors.filter((item) => item.type === 'warning'));
    });

    return {
        valid: errors.length === 0,
        errors,
        warnings,
    };
}

function applyModeRules(
    mode: WorkflowMode,
    nodes: Node[],
    edges: Edge[],
    cycles: string[][],
    errors: ValidationError[],
    warnings: ValidationError[],
) {
    if (mode === 'lineal') {
        nodes.forEach((node) => {
            const kind = resolveNodeKind(node as any);
            if (!LINEAL_BLOCKED_KINDS.has(kind)) return;

            errors.push({
                type: 'error',
                message: `Lineal mode does not allow "${getNodeLabel(node)}". Use Branching mode for decision, parallel, or loop paths.`,
                nodeId: node.id,
                code: 'LINEAL_BRANCH_NODE_NOT_ALLOWED',
            });
        });

        nodes.forEach((node) => {
            const outgoingCount = edges.filter((edge) => edge.source === node.id).length;
            if (outgoingCount > 1) {
                errors.push({
                    type: 'error',
                    message: `"${getNodeLabel(node)}" has more than one outgoing path. Lineal mode allows one path at a time.`,
                    nodeId: node.id,
                    code: 'LINEAL_FAN_OUT_NOT_ALLOWED',
                });
            }
        });

        nodes.forEach((node) => {
            const incomingCount = edges.filter((edge) => edge.target === node.id).length;
            if (incomingCount > 1) {
                errors.push({
                    type: 'error',
                    message: `"${getNodeLabel(node)}" has multiple incoming paths. Lineal mode allows only one incoming path.`,
                    nodeId: node.id,
                    code: 'LINEAL_FAN_IN_NOT_ALLOWED',
                });
            }
        });
    }

    if (mode === 'lineal' || mode === 'branching') {
        cycles.forEach((cycle) => {
            errors.push({
                type: 'error',
                message: `${mode === 'lineal' ? 'Lineal' : 'Branching'} mode does not allow circular paths: ${cycle.join(' -> ')}`,
                code: 'CYCLE_DETECTED',
            });
        });
        return;
    }

    cycles.forEach((cycle) => {
        warnings.push({
            type: 'warning',
            message: `Circular path detected and allowed in Circular mode: ${cycle.join(' -> ')}. Monitor runtime alerts for long-running loops.`,
            code: 'CYCLE_ALLOWED_IN_CIRCULAR',
        });
    });
}

function detectDisconnectedNodes(nodes: Node[], edges: Edge[], startNodeIds: string[]): string[] {
    const reachable = new Set<string>();
    const adjacency = new Map<string, string[]>();

    edges.forEach((edge) => {
        if (!adjacency.has(edge.source)) adjacency.set(edge.source, []);
        adjacency.get(edge.source)!.push(edge.target);
    });

    const visit = (nodeId: string) => {
        if (reachable.has(nodeId)) return;
        reachable.add(nodeId);
        const next = adjacency.get(nodeId) || [];
        next.forEach((target) => visit(target));
    };

    startNodeIds.forEach((nodeId) => visit(nodeId));

    return nodes
        .filter((node) => !reachable.has(node.id))
        .map((node) => node.id);
}

function detectCycles(nodes: Node[], edges: Edge[]): string[][] {
    const nodeMap = new Map(nodes.map((node) => [node.id, node]));
    const adjacency = new Map<string, string[]>();
    edges.forEach((edge) => {
        if (!adjacency.has(edge.source)) adjacency.set(edge.source, []);
        adjacency.get(edge.source)!.push(edge.target);
    });

    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const path: string[] = [];
    const cycles: string[][] = [];
    const signatures = new Set<string>();

    const dfs = (nodeId: string) => {
        visited.add(nodeId);
        recursionStack.add(nodeId);
        path.push(nodeId);

        const outgoing = [...(adjacency.get(nodeId) || [])].sort();
        for (const targetId of outgoing) {
            if (!visited.has(targetId)) {
                dfs(targetId);
                continue;
            }

            if (!recursionStack.has(targetId)) continue;

            const cycleStartIndex = path.indexOf(targetId);
            if (cycleStartIndex < 0) continue;

            const cycleNodeIds = [...path.slice(cycleStartIndex), targetId];
            const signature = canonicalCycleSignature(cycleNodeIds);
            if (signatures.has(signature)) continue;
            signatures.add(signature);

            cycles.push(
                cycleNodeIds.map((id) => {
                    const node = nodeMap.get(id);
                    return node ? getNodeLabel(node) : id;
                }),
            );
        }

        path.pop();
        recursionStack.delete(nodeId);
    };

    [...nodeMap.keys()].sort().forEach((nodeId) => {
        if (!visited.has(nodeId)) dfs(nodeId);
    });

    return cycles;
}

function canonicalCycleSignature(cycleNodeIds: string[]): string {
    if (cycleNodeIds.length <= 2) return cycleNodeIds.join('->');

    const body = cycleNodeIds.slice(0, -1);
    const rotations = body.map((_, idx) => {
        const rotated = [...body.slice(idx), ...body.slice(0, idx)];
        return rotated.join('->');
    });

    return rotations.sort()[0];
}

function validateNodeConfiguration(node: Node): ValidationError[] {
    const errors: ValidationError[] = [];
    const nodeKind = resolveNodeKind(node as any);
    const nodeLabel = getNodeLabel(node);

    if (nodeKind === 'httpRequest') {
        const config = (node.data as any).httpRequest;
        if (!config?.url) {
            errors.push({
                type: 'error',
                message: `HTTP Request "${nodeLabel}" needs a URL.`,
                nodeId: node.id,
                code: 'MISSING_REQUIRED_FIELD',
            });
        }
    }

    if (nodeKind === 'sendEmail') {
        const config = (node.data as any).emailConfig;
        if (!config?.recipient) {
            errors.push({
                type: 'warning',
                message: `Email step "${nodeLabel}" is missing a recipient.`,
                nodeId: node.id,
                code: 'MISSING_RECOMMENDED_FIELD',
            });
        }
    }

    if (nodeKind === 'databaseQuery') {
        const config = (node.data as any).dbConfig;
        const dbType = config?.dbType || 'postgres';
        const validDbTypes = ['postgres', 'mysql', 'mongodb', 'generic'];

        if (config?.dbType && !validDbTypes.includes(config.dbType)) {
            errors.push({
                type: 'error',
                message: `Database step "${nodeLabel}" uses an unsupported database type.`,
                nodeId: node.id,
                code: 'INVALID_DB_TYPE',
            });
        }

        if (!config?.connectionString) {
            errors.push({
                type: 'error',
                message: `Database step "${nodeLabel}" needs a connection string.`,
                nodeId: node.id,
                code: 'MISSING_REQUIRED_FIELD',
            });
        }

        if (!config?.query) {
            errors.push({
                type: 'error',
                message: `Database step "${nodeLabel}" needs a ${dbType === 'mongodb' ? 'MongoDB operation' : 'query'}.`,
                nodeId: node.id,
                code: 'MISSING_REQUIRED_FIELD',
            });
        }

        if (dbType === 'mongodb' && config?.query) {
            try {
                const parsed = JSON.parse(config.query);
                if (!parsed.collection || !parsed.operation) {
                    errors.push({
                        type: 'warning',
                        message: `MongoDB step "${nodeLabel}" should include "collection" and "operation".`,
                        nodeId: node.id,
                        code: 'INVALID_MONGODB_OPERATION',
                    });
                }
            } catch {
                errors.push({
                    type: 'error',
                    message: `MongoDB step "${nodeLabel}" must use valid JSON for operation details.`,
                    nodeId: node.id,
                    code: 'INVALID_JSON',
                });
            }
        }
    }

    if (nodeKind === 'subWorkflow') {
        const workflowId = (node.data as any).workflowId;
        if (!workflowId) {
            errors.push({
                type: 'error',
                message: `Sub-workflow step "${nodeLabel}" needs a workflow ID.`,
                nodeId: node.id,
                code: 'MISSING_REQUIRED_FIELD',
            });
        }
    }

    errors.push(...validateSerialization(node));
    return errors;
}

function validateSerialization(node: Node): ValidationError[] {
    const errors: ValidationError[] = [];

    const configFields = [
        { key: 'httpRequest', label: 'HTTP Request' },
        { key: 'emailConfig', label: 'Email' },
        { key: 'dbConfig', label: 'Database' },
        { key: 'scriptConfig', label: 'Script' },
        { key: 'slackConfig', label: 'Slack' },
        { key: 'params', label: 'Parameters' },
    ];

    configFields.forEach(({ key, label }) => {
        const value = (node.data as any)[key];
        if (value === undefined || value === null) return;

        try {
            JSON.parse(JSON.stringify(value));
        } catch {
            errors.push({
                type: 'error',
                message: `${label} settings contain unsupported values.`,
                nodeId: node.id,
                code: 'NON_SERIALIZABLE_VALUE',
            });
        }
    });

    if ((node.data as any).params) {
        try {
            JSON.parse((node.data as any).params);
        } catch {
            errors.push({
                type: 'error',
                message: `Parameters on "${getNodeLabel(node)}" must be valid JSON.`,
                nodeId: node.id,
                code: 'INVALID_JSON',
            });
        }
    }

    if ((node.data as any).httpRequest?.body) {
        try {
            JSON.parse((node.data as any).httpRequest.body);
        } catch {
            errors.push({
                type: 'warning',
                message: `HTTP body on "${getNodeLabel(node)}" should be valid JSON.`,
                nodeId: node.id,
                code: 'INVALID_JSON',
            });
        }
    }

    return errors;
}
